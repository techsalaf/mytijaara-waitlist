<?php

namespace Tests\Concerns;

use App\Models\DataRoomAccessGrant;
use App\Models\DataRoomDocument;
use App\Models\DataRoomFolder;
use App\Models\DataRoomSession;
use App\Models\DataRoomSetting;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Row builders for the data room tests.
 *
 * The DataRoom* models have no factories on purpose: every one of them is only
 * ever created by an administrator through a validated controller, so a factory
 * would be a second, untested way to build a row. These helpers stay explicit
 * about which columns matter to which assertion.
 */
trait BuildsDataRoom
{
    protected function folder(string $name = '02 Financials & Models', int $order = 20): DataRoomFolder
    {
        return DataRoomFolder::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::random(4),
            'description' => 'Test category.',
            'sort_order' => $order,
        ]);
    }

    /**
     * A published document with plausible metadata. Pass `status` to test the
     * draft/archived paths, `downloads_permitted` to test the document-level veto.
     */
    protected function document(array $attributes = []): DataRoomDocument
    {
        return DataRoomDocument::create($attributes + [
            'title' => 'Financial Model',
            'description' => 'Five year operating model.',
            'file_path' => 'documents/'.Str::uuid().'.pdf',
            'original_filename' => 'financial-model.pdf',
            'file_type' => 'pdf',
            'file_size' => 204_800,
            'version' => '1.0',
            'status' => 'published',
            'confidentiality_level' => 'confidential',
            'checksum' => hash('sha256', Str::random(16)),
            'downloads_permitted' => true,
        ]);
    }

    /**
     * An access grant plus the plaintext code that opens it.
     *
     * @return array{0: DataRoomAccessGrant, 1: string}
     */
    protected function grantWithCode(array $attributes = []): array
    {
        $code = $attributes['code'] ?? 'MTJ-8F4K-92QX';
        unset($attributes['code']);

        $grant = DataRoomAccessGrant::create($attributes + [
            'visitor_name' => 'Amina Yusuf',
            'visitor_email' => 'amina@examplevc.com',
            'organization' => 'Example Ventures',
            'role_title' => 'Investor',
            'access_code_hash' => Hash::make($code),
            'code_hint' => substr($code, -4),
            'expires_at' => now()->addDays(14),
            'status' => 'active',
            'all_documents_access' => false,
            'downloads_permitted' => true,
        ]);

        return [$grant, $code];
    }

    /**
     * Mint a live session for a grant without going through authenticate(), so
     * authorization tests do not re-test authentication on every case.
     *
     * @return string the raw bearer token
     */
    protected function sessionToken(DataRoomAccessGrant $grant, array $attributes = []): string
    {
        $raw = Str::random(64);

        DataRoomSession::create($attributes + [
            'access_grant_id' => $grant->id,
            'token_hash' => hash('sha256', $raw),
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit',
            'expires_at' => now()->addMinutes(30),
            'absolute_expires_at' => now()->addHours(8),
            'last_active_at' => now(),
        ]);

        return $raw;
    }

    /** @return array<string,string> */
    protected function visitorHeaders(string $token): array
    {
        return ['Authorization' => 'Bearer '.$token, 'Accept' => 'application/json'];
    }

    /** The settings row, materialized with its migration defaults. */
    protected function settings(): DataRoomSetting
    {
        return DataRoomSetting::current();
    }
}
