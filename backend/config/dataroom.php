<?php

/*
|--------------------------------------------------------------------------
| Virtual Data Room
|--------------------------------------------------------------------------
| Deployment-level configuration for the VDR. These are the values an
| operator controls without touching the database. Anything an administrator
| can flip from the UI lives in `dataroom_settings` instead; the two are
| combined by App\Services\DataRoom\DataRoomPolicyResolver, where the
| environment always wins so a compromised admin session cannot re-enable a
| data room an operator has switched off at the infrastructure level.
*/

return [

    // Master kill switch. When false every VDR route answers 403 regardless
    // of what the settings row says.
    'enabled' => env('DATA_ROOM_ENABLED', true),

    // Optional site-wide PIN barrier in front of the per-visitor grant.
    // Store the bcrypt hash, never the PIN. Generate with:
    //   php artisan dataroom:hash-pin
    'master_pin_hash' => env('DATA_ROOM_MASTER_PIN_HASH'),

    // Absolute session lifetime in minutes. Activity cannot extend past this.
    'session_ttl' => (int) env('DATA_ROOM_SESSION_TTL', 480),

    // Idle timeout in minutes. Refreshed on every authenticated request.
    'idle_timeout' => (int) env('DATA_ROOM_IDLE_TIMEOUT', 30),

    // Failed authentication attempts per IP before a temporary lockout.
    'max_failed_attempts' => (int) env('DATA_ROOM_MAX_FAILED_ATTEMPTS', 5),

    // Lockout window in seconds once max_failed_attempts is reached.
    'lockout_seconds' => (int) env('DATA_ROOM_LOCKOUT_SECONDS', 900),

    // Filesystem disk holding document bytes. Must never be publicly served.
    'storage_disk' => env('DATA_ROOM_STORAGE_DISK', 'dataroom'),

    // Per-visitor watermarking of PDF previews and downloads.
    'watermark_enabled' => env('DATA_ROOM_WATERMARK_ENABLED', true),

    'uploads' => [
        // Extension => allowed MIME types. An upload must satisfy both, so a
        // .pdf carrying a PE header is rejected before it reaches storage.
        'allowed' => [
            'pdf' => ['application/pdf'],
            'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
            'doc' => ['application/msword', 'application/vnd.ms-office', 'application/x-ole-storage'],
            'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
            'xls' => ['application/vnd.ms-excel', 'application/vnd.ms-office', 'application/x-ole-storage'],
            'pptx' => ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip'],
            'ppt' => ['application/vnd.ms-powerpoint', 'application/vnd.ms-office', 'application/x-ole-storage'],
            'csv' => ['text/csv', 'text/plain', 'application/csv'],
            'md' => ['text/markdown', 'text/plain', 'text/x-markdown'],
            'png' => ['image/png'],
            'jpg' => ['image/jpeg'],
            'jpeg' => ['image/jpeg'],
            'zip' => ['application/zip', 'application/x-zip-compressed'],
        ],

        // Maximum upload size in kilobytes.
        'max_kb' => (int) env('DATA_ROOM_MAX_UPLOAD_KB', 51200),

        // Extensions that are rejected even if they appear in `allowed`, and
        // are rejected anywhere in a multi-part filename so `deck.pdf.exe` and
        // `deck.php.pdf` both fail. Belt and braces on top of the allowlist.
        'forbidden_extensions' => [
            'php', 'phtml', 'phar', 'php3', 'php4', 'php5', 'php7', 'php8',
            'exe', 'dll', 'com', 'bat', 'cmd', 'scr', 'msi', 'msp', 'cpl',
            'sh', 'bash', 'zsh', 'ps1', 'psm1', 'vbs', 'vbe', 'js', 'jse',
            'jar', 'war', 'py', 'pl', 'rb', 'cgi', 'htaccess', 'htpasswd',
            'so', 'dylib', 'app', 'deb', 'rpm', 'lnk', 'reg', 'hta', 'svg',
            'html', 'htm', 'xhtml', 'shtml',
        ],
    ],

    'antivirus' => [
        // ClamAV is not provisioned in this deployment. When false, uploads go
        // straight from validation to the private disk and the limitation is
        // recorded in docs/data-room/known-limitations.md rather than being
        // silently papered over. Set to true and point `clamscan_path` at a
        // binary to turn the quarantine stage on.
        'enabled' => env('DATA_ROOM_AV_ENABLED', false),
        'clamscan_path' => env('DATA_ROOM_CLAMSCAN_PATH', '/usr/bin/clamscan'),
        'timeout_seconds' => (int) env('DATA_ROOM_AV_TIMEOUT', 60),
    ],
];
