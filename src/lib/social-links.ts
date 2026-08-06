/**
 * Social media links — single source of truth.
 * Update the `href` values to match your actual profile URLs.
 * The `id` field must match a key in the icon map inside social-float.tsx.
 */
export interface SocialLink {
  id: string;
  label: string;
  href: string;
  ariaLabel: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  {
    id: "twitter",
    label: "X / Twitter",
    href: "https://twitter.com/mytijaara",
    ariaLabel: "Follow MyTijaara on X / Twitter",
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "https://instagram.com/mytijaara",
    ariaLabel: "Follow MyTijaara on Instagram",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://linkedin.com/company/mytijaara",
    ariaLabel: "Connect with MyTijaara on LinkedIn",
  },
  {
    id: "facebook",
    label: "Facebook",
    href: "https://facebook.com/mytijaara",
    ariaLabel: "Like MyTijaara on Facebook",
  },
  {
    id: "youtube",
    label: "YouTube",
    href: "https://youtube.com/@mytijaara",
    ariaLabel: "Subscribe to MyTijaara on YouTube",
  },
  {
    id: "tiktok",
    label: "TikTok",
    href: "https://tiktok.com/@mytijaara",
    ariaLabel: "Follow MyTijaara on TikTok",
  },
];
