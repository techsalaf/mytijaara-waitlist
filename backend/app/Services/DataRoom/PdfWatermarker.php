<?php

namespace App\Services\DataRoom;

use Illuminate\Support\Facades\Log;
use setasign\Fpdi\PdfParser\StreamReader;
use Throwable;

/**
 * Stamps a per-visitor watermark onto every page of a PDF.
 *
 * This is deterrence and traceability, not copy protection. A determined
 * recipient can always re-render a document; the point is that any copy which
 * escapes carries the email address it was issued to.
 *
 * Returns null when the source PDF cannot be re-imported (encrypted, or using
 * a structure FPDI's free parser cannot read). Callers must treat null as
 * "serve the original unstamped" and never as "deny", so a watermarking failure
 * can never break legitimate access. Which path was taken is recorded in the
 * audit trail by the caller.
 */
class PdfWatermarker
{
    /**
     * @param  string  $pdfBytes  raw source PDF
     * @param  list<string>  $lines  watermark lines; the first is the large diagonal mark
     * @return string|null stamped PDF bytes, or null when stamping is not possible
     */
    public function stamp(string $pdfBytes, array $lines): ?string
    {
        $lines = array_values(array_filter($lines, fn ($l) => trim((string) $l) !== ''));

        if ($lines === [] || $pdfBytes === '') {
            return null;
        }

        try {
            $pdf = new WatermarkPdf;
            $pdf->SetAutoPageBreak(false);
            $pdf->SetCompression(true);
            $pageCount = $pdf->setSourceFile(StreamReader::createByString($pdfBytes));

            for ($page = 1; $page <= $pageCount; $page++) {
                $templateId = $pdf->importPage($page);
                $size = $pdf->getTemplateSize($templateId);

                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId);

                $this->drawDiagonalMark($pdf, $size['width'], $size['height'], $lines[0]);
                $this->drawAttribution($pdf, $size['width'], $size['height'], array_slice($lines, 1));
            }

            return $pdf->Output('S');
        } catch (Throwable $e) {
            // Encrypted or non-conforming PDFs land here. Log the reason only —
            // never the document bytes or the visitor's watermark lines.
            Log::warning('Data room PDF watermarking skipped', ['reason' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Large rotated label across the page. Drawn after useTemplate() so it sits
     * above the original content, in light grey so the content underneath stays
     * readable.
     */
    private function drawDiagonalMark(WatermarkPdf $pdf, float $width, float $height, string $text): void
    {
        // Scale the mark to the page so a landscape A3 and a portrait A4 both
        // end up with a label spanning roughly two thirds of the width.
        $fontSize = 40;
        $pdf->SetFont('Helvetica', 'B', $fontSize);
        $target = $width * 0.62;
        $measured = $pdf->GetStringWidth($text);

        if ($measured > 0) {
            $fontSize = max(18, min(64, (int) round($fontSize * $target / $measured)));
            $pdf->SetFont('Helvetica', 'B', $fontSize);
            $measured = $pdf->GetStringWidth($text);
        }

        $pdf->SetTextColor(203, 203, 203);
        $pdf->rotatedText(max(4, ($width - $measured) / 2), $height / 2 + $measured * 0.28, $text, 30);
    }

    /** Attribution block in the bottom margin: who this exact copy was issued to. */
    private function drawAttribution(WatermarkPdf $pdf, float $width, float $height, array $lines): void
    {
        if ($lines === []) {
            return;
        }

        $pdf->SetFont('Helvetica', '', 7);
        $pdf->SetTextColor(128, 128, 128);

        $line = implode('  |  ', $lines);
        $measured = $pdf->GetStringWidth($line);

        $pdf->Text(max(4, ($width - $measured) / 2), $height - 4, $line);
    }
}
