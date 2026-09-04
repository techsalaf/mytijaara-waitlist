<?php

/*
|--------------------------------------------------------------------------
| Cron trigger
|--------------------------------------------------------------------------
| The deployment target is Namecheap shared cPanel hosting: no daemon, no
| Supervisor, no long-lived worker. Scheduled work is therefore driven either by
| a cPanel "Cron Job" running `php artisan schedule:run`, or — when the host's
| cron cannot execute PHP CLI — by cURL-ing the protected HTTP endpoint below.
|
| That endpoint runs a FIXED allowlist of commands. It never takes a command
| name from the request, so a leaked URL cannot be turned into a way to send
| arbitrary mail; the worst it can do is trigger work the scheduler would have
| done anyway.
*/

return [

    /**
     * Shared secret for `GET /api/v1/cron/run`. Set `CRON_TOKEN` in `.env` to a
     * long random string.
     *
     * Empty means the endpoint refuses every request with 503. Fail closed: an
     * unauthenticated cron trigger was the original state of this route and it
     * is not a state worth being able to fall back into by forgetting a
     * variable.
     */
    'token' => (string) env('CRON_TOKEN', ''),

    /**
     * Artisan commands the HTTP trigger may run, keyed by the `task` value the
     * caller passes as `?task=`. Anything not listed here is rejected with 422.
     *
     * `all` is the default and is what the cPanel instructions use, so one cron
     * entry covers everything scheduled.
     */
    'tasks' => [
        'campaigns' => 'campaigns:send-due',
        'reminders' => 'waitlist:send-verification-reminders',
    ],

];
