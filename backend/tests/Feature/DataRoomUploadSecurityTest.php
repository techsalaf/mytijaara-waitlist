<?php

namespace Tests\Feature;

use App\Services\DataRoom\DocumentUploader;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

/**
 * Upload validation gates.
 *
 * The premise is that the uploaded filename is attacker-controlled text and
 * nothing more. Each test here supplies a name or a payload an attacker would
 * use and asserts nothing reaches the disk.
 */
class DataRoomUploadSecurityTest extends TestCase
{
    use RefreshDatabase;

    private DocumentUploader $uploader;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('dataroom');
        config(['dataroom.storage_disk' => 'dataroom']);

        $this->uploader = new DocumentUploader();
    }

    /** A real PDF: finfo has to see %PDF- magic bytes or the MIME check fails. */
    private function pdf(string $name = 'financial-model.pdf'): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'vdr').'.pdf';
        file_put_contents($path, "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");

        return new UploadedFile($path, $name, 'application/pdf', null, true);
    }

    private function bytes(string $name, string $contents, string $claimedMime): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'vdr');
        file_put_contents($path, $contents);

        return new UploadedFile($path, $name, $claimedMime, null, true);
    }

    // -- the happy path, so the negatives mean something -------------------

    public function test_a_valid_pdf_is_stored_under_a_generated_name(): void
    {
        $result = $this->uploader->store($this->pdf());

        // The stored path is a uuid this class generated. The client name only
        // survives as a display label.
        $this->assertMatchesRegularExpression(
            '#^documents/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$#',
            $result['path']
        );
        $this->assertSame('financial-model.pdf', $result['original_filename']);
        $this->assertSame('pdf', $result['file_type']);
        $this->assertSame(64, strlen($result['checksum']));

        Storage::disk('dataroom')->assertExists($result['path']);
        // Nothing is left behind in quarantine.
        $this->assertSame([], Storage::disk('dataroom')->files('quarantine'));
    }

    public function test_the_checksum_is_the_sha256_of_the_stored_bytes(): void
    {
        $result = $this->uploader->store($this->pdf());

        $this->assertSame(
            hash('sha256', Storage::disk('dataroom')->get($result['path'])),
            $result['checksum']
        );
    }

    public function test_scanning_is_honestly_reported_as_not_having_happened(): void
    {
        config(['dataroom.antivirus.enabled' => false]);

        // The spec is explicit: document the gap rather than pretend a scan ran.
        $this->assertFalse($this->uploader->store($this->pdf())['scanned']);
    }

    public function test_an_enabled_but_missing_scanner_fails_closed(): void
    {
        config([
            'dataroom.antivirus.enabled' => true,
            'dataroom.antivirus.clamscan_path' => '/nonexistent/clamscan',
        ]);

        // "Scanner configured but broken" must reject the upload, not wave it
        // through with scanned => false.
        $this->expectException(RuntimeException::class);

        try {
            $this->uploader->store($this->pdf());
        } finally {
            // And it must not leave the bytes sitting in quarantine.
            $this->assertSame([], Storage::disk('dataroom')->files('quarantine'));
            $this->assertSame([], Storage::disk('dataroom')->files('documents'));
        }
    }

    // -- double extensions -------------------------------------------------

    /**
     * Every dot-separated segment is checked, so a forbidden extension buried
     * in the middle of a name is caught as readily as a trailing one.
     */
    public function test_a_forbidden_extension_anywhere_in_the_name_is_rejected(): void
    {
        $names = [
            'model.php.pdf',      // forbidden segment hidden before a safe one
            'deck.pdf.exe',       // safe segment in front of an executable
            'shell.phtml.pdf',
            'payload.pdf.php',
            'script.pdf.js',
            'page.pdf.html',
            'archive.pdf.sh',
            'config.pdf.htaccess',
        ];

        foreach ($names as $name) {
            try {
                $this->uploader->resolveExtension($this->bytes($name, '%PDF-1.4', 'application/pdf'));
                $this->fail("Filename {$name} was accepted.");
            } catch (RuntimeException $e) {
                $this->assertSame('That file type is not permitted in the data room.', $e->getMessage());
            }
        }

        $this->assertSame([], Storage::disk('dataroom')->allFiles());
    }

    public function test_an_extension_outside_the_allowlist_is_rejected(): void
    {
        foreach (['notes.txt', 'archive.rar', 'video.mp4', 'model.xlsm', 'data.sql'] as $name) {
            $this->expectExceptionOnStore($name, '%PDF-1.4', 'application/pdf');
        }
    }

    public function test_a_file_with_no_extension_is_rejected(): void
    {
        $this->expectExceptionOnStore('financialmodel', '%PDF-1.4', 'application/pdf');
    }

    public function test_a_null_byte_in_the_filename_is_rejected(): void
    {
        // The classic truncation trick: everything after \0 is dropped by some
        // C-level path handling, turning shell.php\0.pdf into shell.php.
        $file = $this->bytes("shell.php\0.pdf", '%PDF-1.4', 'application/pdf');

        try {
            $this->uploader->resolveExtension($file);
            $this->fail('A filename containing a null byte was accepted.');
        } catch (RuntimeException $e) {
            $this->assertSame('That filename is not accepted.', $e->getMessage());
        }
    }

    // -- MIME spoofing -----------------------------------------------------

    public function test_a_php_script_renamed_to_pdf_is_rejected_on_its_contents(): void
    {
        // Extension allowlist satisfied, forbidden list satisfied, and still
        // refused: finfo reads the real bytes.
        $file = $this->bytes('invoice.pdf', "<?php system(\$_GET['c']); ?>", 'application/pdf');

        try {
            $this->uploader->store($file);
            $this->fail('A PHP script with a .pdf extension was stored.');
        } catch (RuntimeException $e) {
            $this->assertSame('The file contents do not match its extension.', $e->getMessage());
        }

        $this->assertSame([], Storage::disk('dataroom')->allFiles());
    }

    public function test_an_executable_renamed_to_pdf_is_rejected_on_its_contents(): void
    {
        // MZ is the DOS/PE header every Windows executable starts with.
        $file = $this->bytes('setup.pdf', "MZ\x90\x00\x03\x00\x00\x00".str_repeat("\x00", 128), 'application/pdf');

        try {
            $this->uploader->store($file);
            $this->fail('A PE binary with a .pdf extension was stored.');
        } catch (RuntimeException $e) {
            $this->assertSame('The file contents do not match its extension.', $e->getMessage());
        }
    }

    public function test_a_browser_supplied_content_type_is_never_trusted(): void
    {
        // The browser header claims image/png; the bytes are a PDF. The stored
        // type follows the extension the server validated, not the header.
        $path = tempnam(sys_get_temp_dir(), 'vdr').'.pdf';
        file_put_contents($path, "%PDF-1.4\ntrailer<</Root 1 0 R>>\n%%EOF");

        $result = $this->uploader->store(new UploadedFile($path, 'deck.pdf', 'image/png', null, true));

        $this->assertSame('pdf', $result['file_type']);
    }

    public function test_an_image_claiming_to_be_a_pdf_is_rejected(): void
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==');

        try {
            $this->uploader->store($this->bytes('chart.pdf', $png, 'application/pdf'));
            $this->fail('A PNG with a .pdf extension was stored.');
        } catch (RuntimeException $e) {
            $this->assertSame('The file contents do not match its extension.', $e->getMessage());
        }
    }

    public function test_a_genuine_png_is_accepted(): void
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==');

        $result = $this->uploader->store($this->bytes('org-chart.png', $png, 'image/png'));

        $this->assertSame('png', $result['file_type']);
        $this->assertStringEndsWith('.png', $result['path']);
    }

    // -- size --------------------------------------------------------------

    public function test_an_oversize_file_is_rejected_before_it_is_written(): void
    {
        config(['dataroom.uploads.max_kb' => 1]);

        try {
            $this->uploader->store($this->bytes('big.pdf', '%PDF-1.4'.str_repeat('A', 4096), 'application/pdf'));
            $this->fail('An oversize file was stored.');
        } catch (RuntimeException $e) {
            $this->assertSame('That file exceeds the maximum upload size.', $e->getMessage());
        }

        $this->assertSame([], Storage::disk('dataroom')->allFiles());
    }

    // -- filename normalization -------------------------------------------

    public function test_a_traversal_filename_cannot_escape_the_display_label(): void
    {
        $cases = [
            '../../../../etc/passwd.pdf' => 'passwd.pdf',
            '..\\..\\windows\\system32\\config.pdf' => 'config.pdf',
            '/absolute/path/model.pdf' => 'model.pdf',
            '....//model.pdf' => 'model.pdf',
        ];

        foreach ($cases as $input => $expected) {
            $this->assertSame($expected, $this->uploader->normalizeFilename($input, 'pdf'));
        }
    }

    public function test_a_normalized_filename_cannot_break_out_of_content_disposition(): void
    {
        // A quote or a newline here would let an attacker inject a second header
        // into the download response.
        foreach (['deck".pdf', "deck\r\nX-Evil: 1.pdf", "deck\t.pdf", 'deck;.pdf'] as $input) {
            $safe = $this->uploader->normalizeFilename($input, 'pdf');

            $this->assertDoesNotMatchRegularExpression('/["\r\n\t;\\\\\/]/', $safe, "Unsafe label: {$safe}");
        }
    }

    public function test_a_filename_of_only_unsafe_characters_falls_back_to_a_default(): void
    {
        $this->assertSame('document.pdf', $this->uploader->normalizeFilename('....', 'pdf'));
        $this->assertSame('document.pdf', $this->uploader->normalizeFilename('/////', 'pdf'));
        $this->assertSame('document.pdf', $this->uploader->normalizeFilename('', 'pdf'));
    }

    public function test_an_overlong_filename_is_truncated(): void
    {
        $safe = $this->uploader->normalizeFilename(str_repeat('a', 400).'.pdf', 'pdf');

        $this->assertLessThanOrEqual(125, strlen($safe));
        $this->assertStringEndsWith('.pdf', $safe);
    }

    public function test_the_stored_extension_always_wins_over_the_label(): void
    {
        // Even if the label somehow retains a different suffix, the extension
        // appended is the validated one.
        $this->assertSame('report.pdf', $this->uploader->normalizeFilename('report.pdf', 'pdf'));
        $this->assertSame('report.png', $this->uploader->normalizeFilename('report', 'png'));
    }

    private function expectExceptionOnStore(string $name, string $contents, string $mime): void
    {
        try {
            $this->uploader->store($this->bytes($name, $contents, $mime));
            $this->fail("Filename {$name} was accepted.");
        } catch (RuntimeException $e) {
            $this->assertSame('That file type is not permitted in the data room.', $e->getMessage());
        }
    }
}
