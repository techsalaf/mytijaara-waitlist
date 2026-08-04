<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\Transport;

/**
 * SMTP credentials live in the `smtp` settings row so an admin can change them
 * from `/admin/settings` without a redeploy. Nothing reads mail config from the
 * environment at request time except as the fallback when the row is empty.
 *
 * `apply()` pushes the stored row into Laravel's runtime mail config. Call it
 * immediately before sending; it is idempotent and cheap (one cached read).
 */
class SmtpConfig
{
    public const GROUP = 'smtp';

    /** Keys the admin form owns. `password` is write-only from the client side. */
    public const FIELDS = ['host', 'port', 'encryption', 'username', 'password', 'fromAddress', 'fromName', 'enabled'];

    /**
     * Stored SMTP settings merged over the environment defaults.
     *
     * @return array<string,mixed>
     */
    public static function current(): array
    {
        $row = Setting::where('group', self::GROUP)->first();
        $data = is_array($row?->data) ? $row->data : [];

        return [
            'enabled' => (bool) ($data['enabled'] ?? false),
            'host' => (string) ($data['host'] ?? config('mail.mailers.smtp.host') ?? ''),
            'port' => (int) ($data['port'] ?? config('mail.mailers.smtp.port') ?? 587),
            'encryption' => (string) ($data['encryption'] ?? config('mail.mailers.smtp.encryption') ?? 'tls'),
            'username' => (string) ($data['username'] ?? config('mail.mailers.smtp.username') ?? ''),
            'password' => (string) ($data['password'] ?? config('mail.mailers.smtp.password') ?? ''),
            'fromAddress' => (string) ($data['fromAddress'] ?? config('mail.from.address') ?? ''),
            'fromName' => (string) ($data['fromName'] ?? config('mail.from.name') ?? 'MyTijaara'),
        ];
    }

    /** True when the stored row is switched on and has enough to connect. */
    public static function isConfigured(): bool
    {
        $c = self::current();

        return $c['enabled'] && $c['host'] !== '' && $c['fromAddress'] !== '';
    }

    /**
     * Push the stored row into the runtime mail config so `Mail::send()` uses
     * it. No-op when the admin has not enabled the stored config, leaving the
     * environment mailer in charge.
     */
    public static function apply(): bool
    {
        if (! self::isConfigured()) {
            return false;
        }

        $c = self::current();

        Config::set('mail.default', 'smtp');
        Config::set('mail.mailers.smtp.transport', 'smtp');
        Config::set('mail.mailers.smtp.host', $c['host']);
        Config::set('mail.mailers.smtp.port', $c['port']);
        // Laravel 11+ uses `scheme`; `encryption` stays for older transports.
        Config::set('mail.mailers.smtp.scheme', $c['encryption'] === 'ssl' ? 'smtps' : 'smtp');
        Config::set('mail.mailers.smtp.encryption', $c['encryption'] === 'none' ? null : $c['encryption']);
        Config::set('mail.mailers.smtp.username', $c['username'] ?: null);
        Config::set('mail.mailers.smtp.password', $c['password'] ?: null);
        Config::set('mail.from.address', $c['fromAddress']);
        Config::set('mail.from.name', $c['fromName']);

        // Drop the resolved mailer so the next send picks up the new transport.
        Mail::purge('smtp');

        return true;
    }

    /**
     * Open a real connection with the given (or stored) credentials.
     *
     * Returns `['ok' => bool, 'message' => string]`. Never throws, so the admin
     * "Test connection" button always gets a usable answer.
     *
     * @param  array<string,mixed>|null  $override
     * @return array{ok:bool,message:string}
     */
    public static function test(?array $override = null): array
    {
        $c = array_merge(self::current(), $override ?? []);

        if ($c['host'] === '') {
            return ['ok' => false, 'message' => 'No SMTP host set.'];
        }

        $scheme = $c['encryption'] === 'ssl' ? 'smtps' : 'smtp';
        $dsn = sprintf(
            '%s://%s%s:%d',
            $scheme,
            $c['username'] !== '' ? rawurlencode($c['username']).':'.rawurlencode((string) $c['password']).'@' : '',
            $c['host'],
            $c['port'],
        );

        try {
            $transport = Transport::fromDsn($dsn);
            // `start()` performs the TCP connect, STARTTLS, and AUTH exchange.
            if (method_exists($transport, 'start')) {
                $transport->start();
            }
            if (method_exists($transport, 'stop')) {
                $transport->stop();
            }

            return ['ok' => true, 'message' => "Connected to {$c['host']}:{$c['port']} as ".($c['username'] ?: 'anonymous').'.'];
        } catch (TransportExceptionInterface $e) {
            return ['ok' => false, 'message' => 'SMTP rejected the connection: '.$e->getMessage()];
        } catch (\Throwable $e) {
            Log::warning('smtp test failed', ['error' => $e->getMessage()]);

            return ['ok' => false, 'message' => 'Could not connect: '.$e->getMessage()];
        }
    }
}
