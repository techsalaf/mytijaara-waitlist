<?php

namespace Tests\Feature;

use App\Models\MediaFile;
use App\Models\MediaFolder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Gate tests for the media library.
 *
 * The page threw on load because `GET /media/folders` returned a bare array
 * instead of the `{data: [...]}` envelope every other endpoint uses, so the
 * client read `undefined` and crashed spreading it into the folder list. These
 * tests pin the envelope, the server-side filtering and sorting the page now
 * relies on, and the in-place replace that keeps existing URLs working.
 */
class MediaLibraryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_folders_endpoint_returns_a_data_envelope_not_a_bare_array(): void
    {
        $this->actingAsRole('super_admin');
        MediaFolder::create(['name' => 'Brand']);

        $response = $this->getJson("{$this->api}/media/folders")->assertOk();

        // The crash was `[...undefined]` on the client, so the contract that
        // matters is that `data` exists and is a list.
        $this->assertIsArray($response->json('data'));
        $this->assertContains('Brand', $response->json('data'));
    }

    public function test_upload_stores_the_file_and_lists_it(): void
    {
        $this->actingAsRole('super_admin');

        $created = $this->post("{$this->api}/media", [
            'file' => UploadedFile::fake()->image('hero.jpg', 800, 600),
            'folder' => 'Brand',
        ])->assertCreated()->json('data');

        $this->assertSame('hero.jpg', $created['name']);
        $this->assertSame('image', $created['type']);
        $this->assertGreaterThan(0, $created['size']);

        $stored = MediaFile::where('public_id', $created['id'])->firstOrFail();
        Storage::disk('public')->assertExists($stored->path);

        $this->getJson("{$this->api}/media")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 1);
    }

    public function test_uploading_into_a_folder_registers_that_folder(): void
    {
        $this->actingAsRole('super_admin');

        $this->post("{$this->api}/media", [
            'file' => UploadedFile::fake()->image('logo.png'),
            'folder' => 'Logos',
        ])->assertCreated();

        $this->getJson("{$this->api}/media/folders")
            ->assertOk()
            ->assertJsonFragment(['Logos']);
    }

    public function test_list_filters_by_folder_and_search_in_sql(): void
    {
        $this->actingAsRole('super_admin');

        $this->post("{$this->api}/media", [
            'file' => UploadedFile::fake()->image('alpha.jpg'),
            'folder' => 'Brand',
        ])->assertCreated();
        $this->post("{$this->api}/media", [
            'file' => UploadedFile::fake()->image('beta.jpg'),
            'folder' => 'Product',
        ])->assertCreated();

        $this->getJson("{$this->api}/media?folder=Brand")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'alpha.jpg');

        $this->getJson("{$this->api}/media?search=beta")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'beta.jpg');
    }

    public function test_sort_by_name_is_applied_server_side(): void
    {
        $this->actingAsRole('super_admin');

        foreach (['zulu.jpg', 'alpha.jpg', 'mike.jpg'] as $name) {
            $this->post("{$this->api}/media", ['file' => UploadedFile::fake()->image($name)])
                ->assertCreated();
        }

        $names = $this->getJson("{$this->api}/media?sort=name")->assertOk()->json('data.*.name');
        $this->assertSame(['alpha.jpg', 'mike.jpg', 'zulu.jpg'], $names);
    }

    public function test_an_unknown_sort_key_is_rejected(): void
    {
        $this->actingAsRole('super_admin');

        $this->getJson("{$this->api}/media?sort=whatever")->assertStatus(422);
    }

    public function test_replace_swaps_the_bytes_and_keeps_the_id_and_url(): void
    {
        $this->actingAsRole('super_admin');

        $original = $this->post("{$this->api}/media", [
            'file' => UploadedFile::fake()->image('hero.jpg', 100, 100),
        ])->assertCreated()->json('data');

        $replaced = $this->post("{$this->api}/media/{$original['id']}/replace", [
            'file' => UploadedFile::fake()->image('hero-v2.jpg', 400, 300),
        ])->assertOk()->json('data');

        // Anything already pointing at this file must keep working.
        $this->assertSame($original['id'], $replaced['id']);
        $this->assertSame($original['url'], $replaced['url']);
        $this->assertSame('hero-v2.jpg', $replaced['name']);
        $this->assertSame('400x300', $replaced['dimensions']);
    }

    public function test_replace_refuses_a_different_media_type(): void
    {
        $this->actingAsRole('super_admin');

        $image = $this->post("{$this->api}/media", [
            'file' => UploadedFile::fake()->image('hero.jpg'),
        ])->assertCreated()->json('data');

        $this->post("{$this->api}/media/{$image['id']}/replace", [
            'file' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'),
        ])->assertStatus(422);
    }

    public function test_delete_removes_the_file_from_disk(): void
    {
        $this->actingAsRole('super_admin');

        $created = $this->post("{$this->api}/media", [
            'file' => UploadedFile::fake()->image('gone.jpg'),
        ])->assertCreated()->json('data');

        $path = MediaFile::where('public_id', $created['id'])->firstOrFail()->path;
        Storage::disk('public')->assertExists($path);

        $this->deleteJson("{$this->api}/media/{$created['id']}")->assertOk();

        Storage::disk('public')->assertMissing($path);
        $this->getJson("{$this->api}/media")->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_creating_a_folder_returns_the_updated_list(): void
    {
        $this->actingAsRole('super_admin');

        $this->postJson("{$this->api}/media/folders", ['name' => 'Campaigns'])
            ->assertCreated()
            ->assertJsonFragment(['Campaigns']);
    }

    public function test_media_endpoints_require_permission(): void
    {
        $this->actingAsPermissionless();

        $this->getJson("{$this->api}/media")->assertForbidden();
        $this->getJson("{$this->api}/media/folders")->assertForbidden();
        $this->postJson("{$this->api}/media/folders", ['name' => 'Nope'])->assertForbidden();
    }
}
