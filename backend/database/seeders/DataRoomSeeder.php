<?php

namespace Database\Seeders;

use App\Models\DataRoomAccessTemplate;
use App\Models\DataRoomFolder;
use App\Models\DataRoomSetting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Seeds the data room's starting shape: the settings row, the five initial
 * categories, and the named access templates.
 *
 * The folder list is data, not structure. Nothing in the code assumes these five
 * exist or that the count stops at five, so 06 Market & Competition through
 * 12 Archive are created through the admin UI with no migration.
 *
 * Idempotent: re-running it neither duplicates rows nor overwrites an admin's
 * edits, so it is safe on an existing deployment.
 */
class DataRoomSeeder extends Seeder
{
    private const FOLDERS = [
        ['01 Corporate Governance', 10, 'Incorporation, shareholding, board and statutory records.'],
        ['02 Financials & Models', 20, 'Historical financials, the operating model, and the fundraising model.'],
        ['03 Pitch Deck & Strategy', 30, 'Investor deck, strategy memos, and the fundraising narrative.'],
        ['04 Product & Technology', 40, 'Product scope, architecture, roadmap, and technical diligence material.'],
        ['05 Commercial & Traction', 50, 'Waitlist growth, partnerships, pipeline, and go-to-market evidence.'],
    ];

    /**
     * Templates map to how the room is actually shared. Each is scoped by folder
     * rather than by document id, so a template stays correct as documents are
     * added to a category it already covers.
     *
     * name => [description, folder sort_orders, downloads, default days, all access]
     */
    private const TEMPLATES = [
        'Investor Basic' => ['Deck and headline traction only. Suitable for a first conversation.', [30, 50], false, 7, false],
        'Investor Standard' => ['Deck, financial model, product and traction. The default for an interested investor.', [20, 30, 40, 50], true, 14, false],
        'VC Investor' => ['Everything an institutional fund asks for in a first diligence pass.', [10, 20, 30, 40, 50], true, 30, false],
        'Strategic Partner' => ['Product, technology and commercial material. No cap table or financials.', [30, 40, 50], false, 14, false],
        'Bank Partner' => ['Governance and financials, for a banking or payments partner assessment.', [10, 20], false, 30, false],
        'Advisor' => ['Strategy and product context for an advisor or mentor.', [30, 40], false, 30, false],
        'Legal Counsel' => ['Governance and financials, with downloads enabled for review.', [10, 20], true, 30, false],
        'Full Diligence' => ['Unrestricted access to every published document, with downloads.', [], true, 30, true],
    ];

    public function run(): void
    {
        // Creates the single settings row with its migration defaults if it is
        // not already there.
        DataRoomSetting::current();

        foreach (self::FOLDERS as [$name, $order, $description]) {
            DataRoomFolder::firstOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'description' => $description, 'sort_order' => $order],
            );
        }

        $byOrder = DataRoomFolder::pluck('id', 'sort_order');

        foreach (self::TEMPLATES as $name => [$description, $orders, $downloads, $days, $allAccess]) {
            DataRoomAccessTemplate::firstOrCreate(
                ['name' => $name],
                [
                    'description' => $description,
                    'all_documents_access' => $allAccess,
                    'downloads_permitted' => $downloads,
                    'default_duration_days' => $days,
                    'document_ids' => [],
                    'folder_ids' => collect($orders)
                        ->map(fn (int $o) => $byOrder[$o] ?? null)
                        ->filter()
                        ->values()
                        ->all(),
                ],
            );
        }
    }
}
