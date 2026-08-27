<?php

namespace App\Services\DataRoom;

use setasign\Fpdi\Fpdi;

/**
 * FPDI subclass that adds rotated text.
 *
 * FPDF exposes no text rotation, and the pieces needed to emit the rotation
 * matrix ($k, $h, _out) are protected, so the capability has to live in a
 * subclass rather than in a caller.
 */
class WatermarkPdf extends Fpdi
{
    /**
     * Draw $text at ($x, $y) rotated $angle degrees counter-clockwise about
     * that point. State is saved and restored so the rotation does not leak
     * into subsequent draws on the same page.
     */
    public function rotatedText(float $x, float $y, string $text, float $angle): void
    {
        $rad = deg2rad($angle);
        $cx = $x * $this->k;
        $cy = ($this->h - $y) * $this->k;

        $this->_out('q');
        $this->_out(sprintf(
            '%.5F %.5F %.5F %.5F %.2F %.2F cm 1 0 0 1 %.2F %.2F cm',
            cos($rad),
            sin($rad),
            -sin($rad),
            cos($rad),
            $cx,
            $cy,
            -$cx,
            -$cy
        ));
        $this->Text($x, $y, $text);
        $this->_out('Q');
    }
}
