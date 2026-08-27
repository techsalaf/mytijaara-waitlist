<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

/**
 * Produce a bcrypt hash for the optional global data room PIN.
 *
 * The plaintext PIN is never stored anywhere by this command: it is read from a
 * hidden prompt, hashed, printed once, and dropped. Put the hash in
 * DATA_ROOM_MASTER_PIN_HASH so the PIN gate is pinned at deploy time and cannot
 * be changed from the admin UI.
 */
class HashDataRoomPin extends Command
{
    protected $signature = 'dataroom:hash-pin {--pin= : Supply the PIN non-interactively (avoid: it lands in shell history)}';

    protected $description = 'Hash a data room global PIN for DATA_ROOM_MASTER_PIN_HASH';

    public function handle(): int
    {
        $pin = $this->option('pin') ?: $this->secret('Enter the data room PIN (minimum 6 characters)');

        if (! is_string($pin) || strlen($pin) < 6) {
            $this->error('The PIN must be at least 6 characters.');

            return self::FAILURE;
        }

        $confirm = $this->option('pin') ?: $this->secret('Confirm the PIN');

        if ($pin !== $confirm) {
            $this->error('The PINs do not match.');

            return self::FAILURE;
        }

        $this->newLine();
        $this->line('Add this line to your .env (quote it, the hash contains $):');
        $this->newLine();
        $this->line('DATA_ROOM_MASTER_PIN_HASH="'.Hash::make($pin).'"');
        $this->newLine();
        $this->warn('Then run: php artisan config:clear');

        return self::SUCCESS;
    }
}
