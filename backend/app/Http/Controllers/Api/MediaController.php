<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MediaFileResource;
use App\Models\MediaFile;
use App\Models\MediaFolder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaController extends Controller
{
    /** GET /media — list with optional type/folder filter + search. */
    public function index(Request $request): JsonResponse
    {
        $query = MediaFile::query();

        if (($type = $request->input('type')) && $type !== 'all') {
            $query->where('type', $type);
        }
        if (($folder = $request->input('folder')) && $folder !== 'all') {
            $query->where('folder', $folder);
        }
        if ($search = $request->string('search')->trim()->value()) {
            $query->where('name', 'like', "%{$search}%");
        }

        $files = $query->orderByDesc('created_at')->get();

        return response()->json([
            'data' => MediaFileResource::collection($files),
            'meta' => ['folders' => $this->folders()],
        ]);
    }

    /** GET /media/folders */
    public function folders(): array
    {
        $fromFiles = MediaFile::query()->select('folder')->distinct()->pluck('folder');
        $declared = MediaFolder::pluck('name');

        return $fromFiles->merge($declared)->filter()->unique()->values()->all();
    }

    /** POST /media — upload a file. Images are processed via intervention/image. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'max:20480'], // 20MB
            'folder' => ['nullable', 'string', 'max:120'],
            'alt' => ['nullable', 'string', 'max:255'],
        ]);

        $file = $request->file('file');
        $folder = $data['folder'] ?? 'Uncategorized';
        $ext = strtolower($file->getClientOriginalExtension());
        $type = $this->resolveType($file->getMimeType(), $ext);

        $stored = $file->store('media/'.Str::slug($folder), 'public');
        $dimensions = null;

        if ($type === 'image' && class_exists(\Intervention\Image\ImageManager::class)) {
            try {
                $manager = \Intervention\Image\ImageManager::gd();
                $img = $manager->read(Storage::disk('public')->path($stored));
                $dimensions = $img->width().'x'.$img->height();
            } catch (\Throwable $e) {
                $dimensions = null;
            }
        }

        $media = MediaFile::create([
            'public_id' => $this->nextPublicId(),
            'name' => $file->getClientOriginalName(),
            'type' => $type,
            'mime' => $file->getMimeType(),
            'size' => $file->getSize(),
            'folder' => $folder,
            'disk' => 'public',
            'path' => $stored,
            'url' => Storage::disk('public')->url($stored),
            'dimensions' => $dimensions,
            'alt' => $data['alt'] ?? null,
            'uploaded_by' => $request->user()?->id,
        ]);

        if ($folder !== 'Uncategorized') {
            MediaFolder::firstOrCreate(['name' => $folder]);
        }

        return response()->json(['data' => new MediaFileResource($media)], 201);
    }

    /** PATCH /media/:id — rename / move / alt text. */
    public function update(Request $request, string $id): JsonResponse
    {
        $media = MediaFile::where('public_id', $id)->firstOrFail();
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'folder' => ['sometimes', 'string', 'max:120'],
            'alt' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);
        $media->update($data);

        return response()->json(['data' => new MediaFileResource($media->fresh())]);
    }

    /** DELETE /media/:id — remove the file from disk + soft-delete the record. */
    public function destroy(string $id): JsonResponse
    {
        $media = MediaFile::where('public_id', $id)->firstOrFail();
        if ($media->disk && $media->path && Storage::disk($media->disk)->exists($media->path)) {
            Storage::disk($media->disk)->delete($media->path);
        }
        $media->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    /** POST /media/folders — create a folder. */
    public function createFolder(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:120']]);
        MediaFolder::firstOrCreate(['name' => $data['name']]);

        return response()->json(['data' => ['folders' => $this->folders()]], 201);
    }

    private function resolveType(?string $mime, string $ext): string
    {
        $mime = (string) $mime;
        if (str_starts_with($mime, 'image/')) {
            return 'image';
        }
        if (str_starts_with($mime, 'video/')) {
            return 'video';
        }
        if (in_array($ext, ['mp4', 'mov', 'webm'], true)) {
            return 'video';
        }

        return 'document';
    }

    private function nextPublicId(): string
    {
        $n = MediaFile::withTrashed()->count() + 1;

        do {
            $id = 'media_'.$n++;
        } while (MediaFile::withTrashed()->where('public_id', $id)->exists());

        return $id;
    }
}
