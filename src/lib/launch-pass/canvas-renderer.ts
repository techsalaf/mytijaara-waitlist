import QRCode from "qrcode";
import type { LaunchPassData, LaunchPassCmsData } from "@/lib/types/launch-pass";
import type { LaunchStatus } from "@/lib/launch/config";
import { settingsApi } from "@/lib/api/settings";

export type CardFormat = "feed" | "story";

export type RenderLaunchPassOptions = {
  data: LaunchPassData;
  cms: LaunchPassCmsData;
  format: CardFormat;
  launchStatus?: LaunchStatus;
  shareUrl?: string;
  brandLogoUrl?: string;
};

let cachedBrandLogoUrl: string | null = null;
const imageCache = new Map<string, HTMLImageElement>();

/**
 * Preloads an image into the memory cache.
 */
export function preloadLaunchPassImage(rawUrl?: string): void {
  if (!rawUrl) return;
  void loadOptionalImage(rawUrl);
}

/**
 * Fetches the official branding logo from CMS public settings in the database.
 */
export async function fetchBrandingLogoFromDb(): Promise<string | null> {
  if (cachedBrandLogoUrl !== null) return cachedBrandLogoUrl;
  if (typeof window === "undefined") return null;
  try {
    const res = await settingsApi.publicSettings();
    if (res && res.data) {
      const url = res.data.logoDarkUrl || res.data.logoUrl || "";
      cachedBrandLogoUrl = url;
      return url;
    }
  } catch {
    // fallback gracefully
  }
  return null;
}

export type ShareLaunchPassOptions = {
  canvas: HTMLCanvasElement;
  title: string;
  text: string;
  url: string;
  filename?: string;
};

/** Dimensions for high-res social assets */
export const CARD_DIMENSIONS: Record<CardFormat, { width: number; height: number }> = {
  feed: { width: 1080, height: 1350 }, // 4:5
  story: { width: 1080, height: 1920 }, // 9:16
};

/** Helper to wrap text into lines fitting within a max width */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Draws rounded rectangle path.
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

/**
 * Normalizes media asset URLs to relative proxy paths when on localhost/same-origin
 * to prevent CORS restrictions and avoid tainting the HTML5 Canvas.
 */
export function normalizeMediaUrl(url?: string): string {
  if (!url) return "";
  if (typeof window !== "undefined") {
    try {
      const parsed = new URL(url, window.location.origin);
      if (
        parsed.pathname.startsWith("/storage/") &&
        (parsed.hostname === "localhost" ||
          parsed.hostname === "127.0.0.1" ||
          parsed.origin === window.location.origin)
      ) {
        return parsed.pathname;
      }
    } catch {
      // return as-is
    }
  }
  return url;
}

function loadSingleImage(src: string, isCors: boolean): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (isCors) {
      img.crossOrigin = "anonymous";
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, 1500);

    img.onload = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(img);
      }
    };
    img.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(null);
      }
    };

    img.src = src;
    if (img.complete && img.naturalWidth > 0) {
      settled = true;
      clearTimeout(timer);
      resolve(img);
    }
  });
}

async function fetchImageBlob(src: string): Promise<HTMLImageElement | null> {
  if (typeof fetch === "undefined" || typeof URL === "undefined") return null;
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    return await loadSingleImage(objectUrl, false);
  } catch {
    return null;
  }
}

/**
 * Safely loads an image for canvas rendering without throwing, blocking, or CORS cache issues.
 */
async function loadOptionalImage(rawUrl?: string): Promise<HTMLImageElement | null> {
  if (!rawUrl || typeof Image === "undefined") return null;
  const url = normalizeMediaUrl(rawUrl);
  if (imageCache.has(url)) {
    const cached = imageCache.get(url)!;
    if (cached.complete && cached.naturalWidth > 0) {
      return cached;
    }
  }

  const isData = url.startsWith("data:");
  const isRelative = url.startsWith("/") && !url.startsWith("//");
  let isSameHost = false;
  if (typeof window !== "undefined" && !isRelative && !isData) {
    try {
      isSameHost = new URL(url).origin === window.location.origin;
    } catch {
      isSameHost = false;
    }
  }
  const isCrossDomain = !isData && !isRelative && !isSameHost;

  const candidates: string[] = [];
  const isStorage = url.includes("/storage/") || url.startsWith("/storage/");

  // Candidate 1: Backend asset proxy route which guarantees CORS headers from Laravel
  if (isStorage) {
    const apiBase =
      typeof window !== "undefined" && window.location.origin.includes("localhost")
        ? "/api/v1"
        : "https://api.mytijaara.com/api/v1";
    candidates.push(`${apiBase}/launch-pass/asset-proxy?url=${encodeURIComponent(url)}`);
  }

  // Candidate 2: Cache-busting URL to bypass any non-CORS browser disk cache
  if (isCrossDomain) {
    const bust = url.includes("?") ? `${url}&cv=2` : `${url}?cv=2`;
    candidates.push(bust);
  }

  // Candidate 3: Raw URL
  candidates.push(url);

  for (const candidate of candidates) {
    // 1. Try Blob fetch first (bypasses browser image tag cache collisions and guarantees clean canvas)
    const blobImg = await fetchImageBlob(candidate);
    if (blobImg && blobImg.naturalWidth > 0) {
      imageCache.set(url, blobImg);
      return blobImg;
    }

    // 2. Fall back to standard Image element
    const directImg = await loadSingleImage(candidate, isCrossDomain);
    if (directImg && directImg.naturalWidth > 0) {
      imageCache.set(url, directImg);
      return directImg;
    }
  }

  return null;
}

/**
 * Render the launch pass directly to a target HTMLCanvasElement.
 */
export async function renderLaunchPassToCanvas(
  canvas: HTMLCanvasElement,
  options: RenderLaunchPassOptions,
): Promise<void> {
  const { data, cms, format, launchStatus = "pre_launch", shareUrl } = options;
  const { width, height } = CARD_DIMENSIONS[format];

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const isLive = launchStatus === "launch_day" || launchStatus === "post_launch";
  const isAttendee = Boolean(data.attendingNatcon);

  // 1. Background Gradient (Deep Emerald / Forest Night)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#05160E");
  bgGrad.addColorStop(0.4, "#0A2418");
  bgGrad.addColorStop(0.8, "#04140D");
  bgGrad.addColorStop(1, "#020B07");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Ambient Radial Glow in center
  const glowGrad = ctx.createRadialGradient(
    width / 2,
    height * 0.45,
    50,
    width / 2,
    height * 0.45,
    width * 0.65,
  );
  glowGrad.addColorStop(0, "rgba(16, 185, 129, 0.14)");
  glowGrad.addColorStop(0.6, "rgba(229, 169, 60, 0.06)");
  glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle Geometric Background Accent Grid
  ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
  ctx.lineWidth = 1;
  const gridSize = 60;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 2. Card Outer Border & Margin
  const margin = 50;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;
  const cornerRadius = 36;

  // Outer Gold Border Frame
  roundRect(ctx, margin, margin, cardW, cardH, cornerRadius);
  ctx.strokeStyle = "rgba(246, 211, 101, 0.45)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Subtle Inner Accent Frame
  roundRect(ctx, margin + 14, margin + 14, cardW - 28, cardH - 28, cornerRadius - 10);
  ctx.strokeStyle = "rgba(16, 185, 129, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 3. Top Header: MyTijaara Brand & Partner (Parallel load)
  const headerY = margin + (format === "story" ? 105 : 75);
  const containerH = 92;

  // Resolve official MyTijaara branding logo from options or CMS database
  const resolvedBrandLogoUrl =
    options.brandLogoUrl || (await fetchBrandingLogoFromDb()) || "";

  // Preload both brand and partner logos in parallel
  const [brandImg, partnerImg] = await Promise.all([
    resolvedBrandLogoUrl ? loadOptionalImage(resolvedBrandLogoUrl) : Promise.resolve(null),
    cms.taaLogoUrl ? loadOptionalImage(cms.taaLogoUrl) : Promise.resolve(null),
  ]);

  if (brandImg && brandImg.naturalWidth > 0 && brandImg.naturalHeight > 0) {
    const maxLogoH = 70;
    const maxLogoW = 300;
    const aspect = brandImg.naturalWidth / brandImg.naturalHeight;
    const logoW = Math.min(maxLogoW, maxLogoH * aspect);
    const logoH = logoW / aspect;

    const badgePadX = 22;
    const badgeW = Math.max(180, logoW + badgePadX * 2);
    const badgeH = containerH;
    const badgeX = margin + 50;
    const badgeY = headerY;
    const badgeRadius = 18;

    // Luminous frosted white plaque so transparent colored/dark logos have 100% clarity
    if (typeof ctx.save === "function") ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeRadius);
    const plateGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeH);
    plateGrad.addColorStop(0, "#FFFFFF");
    plateGrad.addColorStop(1, "#F8FAFC");
    ctx.fillStyle = plateGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(229, 169, 60, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (typeof ctx.restore === "function") ctx.restore();

    // Centered brand logo inside plaque
    const logoX = badgeX + (badgeW - logoW) / 2;
    const logoY = badgeY + (badgeH - logoH) / 2;
    ctx.drawImage(brandImg, logoX, logoY, logoW, logoH);

    // Brand Sub-badge below plaque
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "800 13px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = "#10B981";
    ctx.fillText("NIGERIA'S SUPER APP", badgeX, badgeY + badgeH + 8);
  } else {
    // Draw Official MyTijaara Vector Emblem (matches Logo component)
    const emblemX = margin + 50;
    const emblemY = headerY;
    const emblemSize = 78;
    const emblemRadius = 22;

    // Outer shadow & background gradient
    if (typeof ctx.save === "function") ctx.save();
    ctx.shadowColor = "rgba(13, 122, 70, 0.4)";
    ctx.shadowBlur = 16;
    const emblemGrad = ctx.createLinearGradient(
      emblemX,
      emblemY,
      emblemX + emblemSize,
      emblemY + emblemSize,
    );
    emblemGrad.addColorStop(0, "#0D7A46");
    emblemGrad.addColorStop(0.6, "#09532F");
    emblemGrad.addColorStop(1, "#042D19");
    roundRect(ctx, emblemX, emblemY, emblemSize, emblemSize, emblemRadius);
    ctx.fillStyle = emblemGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(246, 211, 101, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (typeof ctx.restore === "function") ctx.restore();

    // Emblem "M" Letter
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 42px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("M", emblemX + emblemSize / 2, emblemY + emblemSize / 2 + 1);

    // Emblem Gold Accent Badge Dot at bottom-right
    const dotCenterX = emblemX + emblemSize - 5;
    const dotCenterY = emblemY + emblemSize - 5;
    const dotRadius = 9.5;

    ctx.beginPath();
    if (typeof ctx.arc === "function") {
      ctx.arc(dotCenterX, dotCenterY, dotRadius + 2.5, 0, Math.PI * 2);
    }
    ctx.fillStyle = "#05160E";
    ctx.fill();

    const dotGrad = ctx.createLinearGradient(
      dotCenterX - dotRadius,
      dotCenterY - dotRadius,
      dotCenterX + dotRadius,
      dotCenterY + dotRadius,
    );
    dotGrad.addColorStop(0, "#FCEEAC");
    dotGrad.addColorStop(0.5, "#E5A93C");
    dotGrad.addColorStop(1, "#B47818");
    ctx.beginPath();
    if (typeof ctx.arc === "function") {
      ctx.arc(dotCenterX, dotCenterY, dotRadius, 0, Math.PI * 2);
    }
    ctx.fillStyle = dotGrad;
    ctx.fill();

    // Brand Name typography beside emblem
    const brandTextX = emblemX + emblemSize + 20;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "800 44px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("MyTijaara", brandTextX, headerY + 4);

    // Brand Sub-badge
    ctx.font = "700 14px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = "#10B981";
    ctx.fillText("NIGERIA'S SUPER APP", brandTextX, headerY + 48);
  }

  // Partner Info (TAA NATCON 2026) on Right
  const partnerRightX = width - margin - 50;

  if (partnerImg && partnerImg.naturalWidth > 0 && partnerImg.naturalHeight > 0) {
    const maxLogoH = 70;
    const maxLogoW = 200;
    const aspect = partnerImg.naturalWidth / partnerImg.naturalHeight;
    const logoW = Math.min(maxLogoW, maxLogoH * aspect);
    const logoH = logoW / aspect;

    const badgePadX = 20;
    const badgeW = Math.max(140, logoW + badgePadX * 2);
    const badgeH = containerH;
    const badgeX = partnerRightX - badgeW;
    const badgeY = headerY;
    const badgeRadius = 18;

    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.font = "800 13px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = "#E5A93C";
    ctx.fillText("OFFICIAL LAUNCH PARTNER", partnerRightX, headerY - 20);

    // Luminous frosted white plaque matching brand side
    if (typeof ctx.save === "function") ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeRadius);
    const plateGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeH);
    plateGrad.addColorStop(0, "#FFFFFF");
    plateGrad.addColorStop(1, "#F8FAFC");
    ctx.fillStyle = plateGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(229, 169, 60, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (typeof ctx.restore === "function") ctx.restore();

    // Centered partner logo inside plaque
    const logoX = badgeX + (badgeW - logoW) / 2;
    const logoY = badgeY + (badgeH - logoH) / 2;
    ctx.drawImage(partnerImg, logoX, logoY, logoW, logoH);
  } else {
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.font = "800 13px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = "#E5A93C";
    ctx.fillText("OFFICIAL LAUNCH PARTNER", partnerRightX, headerY);

    ctx.font = "800 28px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(cms.eventName, partnerRightX, headerY + 24);

    ctx.font = "600 16px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = "#94A3B8";
    ctx.fillText(cms.eventDate, partnerRightX, headerY + 58);
  }

  // Decorative divider line under header
  const dividerY = headerY + 130;
  const lineGrad = ctx.createLinearGradient(margin + 50, dividerY, width - margin - 50, dividerY);
  lineGrad.addColorStop(0, "rgba(229, 169, 60, 0.1)");
  lineGrad.addColorStop(0.5, "rgba(229, 169, 60, 0.8)");
  lineGrad.addColorStop(1, "rgba(229, 169, 60, 0.1)");
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin + 50, dividerY);
  ctx.lineTo(width - margin - 50, dividerY);
  ctx.stroke();

  // 4. Variant Badge Pill (Attendee vs General)
  const badgeY = dividerY + (format === "story" ? 60 : 35);
  const badgeText = isAttendee ? "CONFERENCE LAUNCH ATTENDEE" : "OFFICIAL LAUNCH PASS";

  ctx.font = "bold 16px 'Plus Jakarta Sans', system-ui, sans-serif";
  const badgeMetrics = ctx.measureText(badgeText);
  const badgePadX = 24;
  const badgeW = badgeMetrics.width + badgePadX * 2;
  const badgeH = 38;
  const badgeX = (width - badgeW) / 2;

  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 19);
  if (isAttendee) {
    ctx.fillStyle = "rgba(229, 169, 60, 0.15)";
    ctx.fill();
    ctx.strokeStyle = "#E5A93C";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#F6D365";
  } else {
    ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
    ctx.fill();
    ctx.strokeStyle = "#10B981";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#34D399";
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, width / 2, badgeY + badgeH / 2);

  // 5. Dynamic Headline (Variant + Pre/Live Status)
  let headline = "";
  if (isLive) {
    headline = isAttendee ? cms.liveHeadlineAttendee : cms.liveHeadlineGeneral;
  } else {
    headline = isAttendee ? cms.headlineAttendee : cms.headlineGeneral;
  }

  const headlineY = badgeY + (format === "story" ? 95 : 70);
  ctx.font = "900 68px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // Headline glow
  ctx.shadowColor = isAttendee ? "rgba(246, 211, 101, 0.4)" : "rgba(16, 185, 129, 0.4)";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(headline, width / 2, headlineY);
  ctx.shadowBlur = 0; // reset shadow

  // Supporting copy
  const copy = isAttendee ? cms.supportingCopyAttendee : cms.supportingCopyGeneral;
  const copyY = headlineY + 90;
  ctx.font = "500 21px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = "#CBD5E1";
  const copyLines = wrapText(ctx, copy, cardW - 140);
  copyLines.forEach((line, idx) => {
    ctx.fillText(line, width / 2, copyY + idx * 32);
  });

  // 6. Ticket Pass Container (Middle Section)
  const ticketY = copyY + copyLines.length * 32 + (format === "story" ? 50 : 25);
  const ticketH = format === "story" ? 440 : 330;
  const ticketX = margin + 50;
  const ticketW = cardW - 100;

  // Pass Box Background
  roundRect(ctx, ticketX, ticketY, ticketW, ticketH, 24);
  ctx.fillStyle = "rgba(11, 35, 25, 0.65)";
  ctx.fill();
  ctx.strokeStyle = "rgba(246, 211, 101, 0.3)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inside Ticket: Member Name
  const memberNameY = ticketY + (format === "story" ? 45 : 30);
  ctx.textAlign = "center";
  ctx.font = "800 15px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = "#94A3B8";
  ctx.fillText("LAUNCH PASS HOLDER", width / 2, memberNameY);

  ctx.font = "900 46px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = "#F8FAFC";
  const formattedName = data.name ? data.name.toUpperCase() : "EARLY SUPPORTER";
  ctx.fillText(formattedName, width / 2, memberNameY + 48);

  // Role & Location Subtitle
  const locRole = [data.city, data.role ? data.role.toUpperCase() : null]
    .filter(Boolean)
    .join(" • ");
  if (locRole) {
    ctx.font = "600 17px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = "#34D399";
    ctx.fillText(locRole, width / 2, memberNameY + 102);
  }

  // Inner Details Grid (Pass Number, Launch Date, Priority)
  const gridY = memberNameY + (format === "story" ? 165 : 130);
  const col1X = ticketX + ticketW * 0.22;
  const col2X = ticketX + ticketW * 0.50;
  const col3X = ticketX + ticketW * 0.78;

  // Label row
  ctx.font = "700 14px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = "#94A3B8";
  ctx.fillText("PASS NUMBER", col1X, gridY);
  ctx.fillText("LAUNCH DATE", col2X, gridY);
  ctx.fillText("STATUS", col3X, gridY);

  // Value row
  ctx.font = "900 32px 'JetBrains Mono', monospace, sans-serif";
  ctx.fillStyle = "#F6D365";
  ctx.fillText(data.launchPassNumber || "#00001", col1X, gridY + 38);

  ctx.font = "800 28px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(cms.eventDateShort, col2X, gridY + 38);

  ctx.font = "800 24px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = isAttendee ? "#F6D365" : "#34D399";
  ctx.fillText(isAttendee ? "ATTENDEE" : "CONFIRMED", col3X, gridY + 38);

  // 7. QR Code & Referral CTA Section (Bottom)
  const qrSectionY = ticketY + ticketH + (format === "story" ? 60 : 35);
  const qrSize = format === "story" ? 160 : 130;
  const qrX = ticketX + 30;

  // Generate real QR code image
  const resolvedQrUrl =
    shareUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/launch-pass/${data.launchPassToken || ""}`
      : `https://mytijaara.com/launch-pass/${data.launchPassToken || ""}`);

  try {
    const qrDataUrl = await QRCode.toDataURL(resolvedQrUrl, {
      margin: 1,
      width: qrSize,
      color: {
        dark: "#05160E",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    });

    if (typeof Image !== "undefined") {
      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise<void>((res) => {
        if (qrImg.complete) {
          res();
          return;
        }
        const timer = setTimeout(res, 50);
        qrImg.onload = () => {
          clearTimeout(timer);
          res();
        };
        qrImg.onerror = () => {
          clearTimeout(timer);
          res();
        };
      });

      // White container box behind QR
      roundRect(ctx, qrX - 8, qrSectionY - 8, qrSize + 16, qrSize + 16, 16);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();

      ctx.drawImage(qrImg, qrX, qrSectionY, qrSize, qrSize);
    }
  } catch {
    // Graceful fallback if QR generation in canvas is unsupported in environment
    roundRect(ctx, qrX, qrSectionY, qrSize, qrSize, 12);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.fillStyle = "#05160E";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("QR CODE", qrX + qrSize / 2, qrSectionY + qrSize / 2);
  }

  // Text next to QR code
  const qrTextX = qrX + qrSize + 40;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  ctx.font = "800 24px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = "#F8FAFC";
  ctx.fillText("SCAN TO JOIN THE LAUNCH", qrTextX, qrSectionY + 12);

  ctx.font = "500 17px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = "#94A3B8";
  ctx.fillText("Join the official waitlist and get your own launch pass.", qrTextX, qrSectionY + 48);

  ctx.font = "700 18px 'JetBrains Mono', monospace, sans-serif";
  ctx.fillStyle = "#34D399";
  const displayUrl = resolvedQrUrl.replace(/^https?:\/\//, "");
  const truncatedUrl = displayUrl.length > 34 ? `${displayUrl.slice(0, 32)}…` : displayUrl;
  ctx.fillText(truncatedUrl, qrTextX, qrSectionY + 82);

  // 8. Card Footer Text
  const footerY = height - margin - (format === "story" ? 60 : 40);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "600 15px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
  ctx.fillText(cms.cardFooterText, width / 2, footerY);
}

/**
 * Export canvas as PNG Blob.
 */
export function exportCanvasAsBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to export canvas to blob"));
      },
      "image/png",
      1.0,
    );
  });
}

/**
 * Trigger immediate browser download of the rendered canvas as PNG.
 */
export function downloadLaunchPass(canvas: HTMLCanvasElement, filename = "mytijaara-launch-pass.png"): void {
  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Formatted social share message.
 */
export function getShareText(data: LaunchPassData, cms: LaunchPassCmsData, url: string): string {
  const baseMsg = data.attendingNatcon ? cms.sharingMessageAttendee : cms.sharingMessage;
  return `${baseMsg}\n\n${url}`;
}

/**
 * Direct WhatsApp URL with pre-filled message.
 */
export function getWhatsAppShareUrl(data: LaunchPassData, cms: LaunchPassCmsData, url: string): string {
  const text = getShareText(data, cms, url);
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Native Web Share API with image file attachment.
 * Gracefully falls back to URL sharing or clipboard copying.
 */
export async function shareLaunchPass(
  options: ShareLaunchPassOptions,
): Promise<{ shared: boolean; method: "native" | "download" | "clipboard" }> {
  const { canvas, title, text, url, filename = "mytijaara-launch-pass.png" } = options;

  try {
    const blob = await exportCanvasAsBlob(canvas);
    const file = new File([blob], filename, { type: "image/png" });

    // Check if browser navigator.canShare supports files
    if (
      typeof navigator !== "undefined" &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title,
        text,
        url,
        files: [file],
      });
      return { shared: true, method: "native" };
    }

    // Fallback 1: Native share without file if available
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({
        title,
        text,
        url,
      });
      return { shared: true, method: "native" };
    }
  } catch (err: unknown) {
    // If user cancelled share sheet, don't treat as an error
    if (err instanceof Error && err.name === "AbortError") {
      return { shared: false, method: "native" };
    }
  }

  // Fallback 2: Copy link to clipboard
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      return { shared: true, method: "clipboard" };
    } catch {
      // ignore
    }
  }

  // Fallback 3: Trigger file download
  downloadLaunchPass(canvas, filename);
  return { shared: true, method: "download" };
}
