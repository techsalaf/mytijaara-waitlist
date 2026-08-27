<?php

namespace App\Services\DataRoom;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;

/**
 * Validates and stores a data room upload.
 *
 * Nothing here trusts the client. The submitted filename is treated as a
 * display label only; the stored path is a name this class generates. The
 * extension the client claims is cross-checked against the MIME type the
 * server detects from the file's own bytes, so a .pdf that is really a PE
 * binary or a PHP script never reaches the disk.
 *
 * Pipeline: validate -> quarantine -> scan -> promote -> checksum. When no
 * scanner is provisioned (config('dataroom.antivirus.enabled') === false) the
 * scan stage is skipped explicitly and the gap is documented in
 * docs/data-room/known-limitations.md. It is not simulated.
 */
class DocumentUploader
{
    /** Subdirectory on the data room disk holding not-yet-scanned bytes. */
    private const QUARANTINE = 'quarantine';

    /** Subdirectory holding validated, scanned document bytes. */
    private const DOCUMENTS = 'documents';

    /**
     * @return array{path:string,original_filename:string,file_type:string,file_size:int,checksum:string,scanned:bool}
     *
     * @throws RuntimeException when the file fails any validation gate
     */
    public function store(UploadedFile $file): array
    {
        $extension = $this->resolveExtension($file);
        $this->assertMimeMatchesExtension($file, $extension);
        $this->assertSizeWithinLimit($file);

        $disk = Storage::disk(config('dataroom.storage_disk', 'dataroom'));

        // The stored name is generated, never derived from client input, so a
        // filename containing ../ or a null byte cannot influence the path.
        $storedName = Str::uuid()->toString().'.'.$extension;
        $quarantinePath = self::QUARANTINE.'/'.$storedName;

        $disk->put($quarantinePath, $file->get());

        $absolute = $disk->path($quarantinePath);
        $scanned = false;

        try {
            $scanned = $this->scan($absolute);
        } catch (RuntimeException $e) {
            $disk->delete($quarantinePath);

            throw $e;
        }

        $finalPath = self::DOCUMENTS.'/'.$storedName;

        if (! $disk->move($quarantinePath, $finalPath)) {
            $disk->delete($quarantinePath);

            throw new RuntimeException('The upload could not be stored. Please try again.');
        }

        return [
            'path' => $finalPath,
            'original_filename' => $this->normalizeFilename($file->getClientOriginalName(), $extension),
            'file_type' => $extension,
            'file_size' => (int) $disk->size($finalPath),
            'checksum' => hash_file('sha256', $disk->path($finalPath)),
            'scanned' => $scanned,
        ];
    }

    /**
     * The extension to trust, taken from the client name but validated against
     * the allowlist and the forbidden list.
     *
     * Every dot-separated segment is checked, not just the last one, which is
     * what stops `model.php.pdf` and `deck.pdf.exe` alike.
     */
    public function resolveExtension(UploadedFile $file): string
    {
        $name = $file->getClientOriginalName();

        if (str_contains($name, "\0")) {
            throw new RuntimeException('That filename is not accepted.');
        }

        $segments = array_map('strtolower', array_slice(explode('.', $name), 1));
        $forbidden = config('dataroom.uploads.forbidden_extensions', []);

        foreach ($segments as $segment) {
            if (in_array($segment, $forbidden, true)) {
                throw new RuntimeException('That file type is not permitted in the data room.');
            }
        }

        $extension = $segments === [] ? '' : (string) end($segments);
        $allowed = config('dataroom.uploads.allowed', []);

        if ($extension === '' || ! array_key_exists($extension, $allowed)) {
            throw new RuntimeException('That file type is not permitted in the data room.');
        }

        return $extension;
    }

    /**
     * Cross-check the detected MIME type against the claimed extension. The
     * detection reads the file's magic bytes server-side; the browser-supplied
     * Content-Type is ignored entirely.
     */
    private function assertMimeMatchesExtension(UploadedFile $file, string $extension): void
    {
        $allowed = config('dataroom.uploads.allowed', []);
        $expected = $allowed[$extension] ?? [];

        // getMimeType() uses finfo on the temp file; getClientMimeType() is the
        // untrusted browser header and is deliberately not consulted.
        $detected = $file->getMimeType();

        if ($detected === null || ! in_array($detected, $expected, true)) {
            throw new RuntimeException('The file contents do not match its extension.');
        }
    }

    private function assertSizeWithinLimit(UploadedFile $file): void
    {
        $maxKb = (int) config('dataroom.uploads.max_kb', 51200);

        if ($file->getSize() > $maxKb * 1024) {
            throw new RuntimeException('That file exceeds the maximum upload size.');
        }
    }

    /**
     * Run the configured scanner over the quarantined file.
     *
     * Returns true when a scan actually happened and the file was clean, false
     * when scanning is not provisioned. Throws when the scanner reports an
     * infection or cannot be executed, because "scanner enabled but broken"
     * must fail closed.
     */
    private function scan(string $absolutePath): bool
    {
        if (! config('dataroom.antivirus.enabled', false)) {
            return false;
        }

        $binary = (string) config('dataroom.antivirus.clamscan_path');
        $process = new Process([$binary, '--no-summary', '--stdout', $absolutePath]);
        $process->setTimeout((float) config('dataroom.antivirus.timeout_seconds', 60));

        try {
            $process->run();
        } catch (ProcessFailedException $e) {
            throw new RuntimeException('The upload could not be scanned and was rejected.');
        }

        // clamscan: 0 = clean, 1 = infected, 2 = error.
        return match ($process->getExitCode()) {
            0 => true,
            1 => throw new RuntimeException('That file was rejected by the malware scanner.'),
            default => throw new RuntimeException('The upload could not be scanned and was rejected.'),
        };
    }

    /**
     * A safe display filename. Used for Content-Disposition, so it must not be
     * able to carry a path, a quote, or a control character.
     */
    public function normalizeFilename(string $original, string $extension): string
    {
        // Take the last path segment first. Keeping the directory portion as
        // underscores would be safe but produces labels like
        // `_.._.._etc_passwd.pdf`; the leading path is not information a
        // recipient needs.
        $base = pathinfo(basename(str_replace('\\', '/', $original)), PATHINFO_FILENAME);
        $base = (string) preg_replace('/[^A-Za-z0-9 ._-]/', '', $base);
        $base = trim(preg_replace('/\s+/', ' ', $base) ?? '');
        $base = ltrim($base, '.');
        $base = Str::limit($base, 120, '');

        if ($base === '') {
            $base = 'document';
        }

        return $base.'.'.$extension;
    }
}
