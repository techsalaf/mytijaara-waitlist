<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Http\Request;

/**
 * Writes admin audit rows.
 *
 * Every controller that mutates state calls `Audit::record()` at the moment the
 * write succeeds, so `audit_logs` is a record of what actually happened rather
 * than something reconstructed on read. Auditing never throws: a failure to log
 * must not roll back the action it was describing.
 */
class Audit
{
    /**
     * @param  array<string,mixed>|array<int,string>  $changes
     */
    public static function record(
        Request $request,
        string $action,
        string $target,
        array $changes = [],
        ?string $subjectType = null,
        ?string $subjectId = null,
    ): void {
        try {
            AuditLog::create([
                'user_id' => $request->user()?->id,
                'actor' => $request->user()?->name,
                'action' => $action,
                'target' => $target,
                'subject_type' => $subjectType,
                'subject_id' => $subjectId,
                'changes' => $changes ?: null,
                'ip' => $request->ip(),
                'device' => substr((string) $request->userAgent(), 0, 255),
            ]);
        } catch (\Throwable) {
            // Auditing must never block the write it is recording.
        }
    }
}
