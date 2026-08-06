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
        $request->validate([
            'type' => ['nullable', 'string', 'in:all,image,video,document'],
            'folder' => ['nullable', 'string', 'max:120'],
            'search' => ['nullable', 'string', 'max:255'],
            'sort' => ['nullable', 'string', 'in:recent,name,size'],
        ]);

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

        // Sorting is applied in SQL so the order survives any future paging.
        match ($request->input('sort', 'recent')) {
            'name' => $query->orderBy('name'),
            'size' => $query->orderByDesc('size'),
            default => $query->orderByDesc('created_at'),
        };

        $files = $query->get();

        return response()->json([
            'data' => MediaFileResource::collection($files),
            'meta' => [
                'folders' => $this->folderNames(),
                'total' => $files->count(),
            ],
        ]);
    }

    /**
     * GET /media/folders
     *
     * Wraps the list in `data` like every other endpoint. This previously
     * returned the bare array, so the client read `undefined` off `.data` and
     * the media page crashed spreading it into the folder list.
     */
    public function folders(): JsonResponse
    {
        return response()->json(['data' => $this->folderNames()]);
    }

    /**
     * Folder names from both the declared folders and the ones files sit in.
     *
     * @return array<int,string>
     */
    private function folderNames(): array
    {
        $fromFiles = MediaFile::query()->select('folder')->distinct()->pluck('folder');
        $declared = MediaFolder::pluck('name');

        return $fromFiles->merge($declared)->filter()->unique()->sort()->values()->all();
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

    /**
     * POST /media/:id/replace — swap the bytes behind an existing record.
     *
     * The record, its public id and its URL stay put, so anything already
     * pointing at this file (a CMS hero image, a logo) keeps working. Uploading
     * a new file and deleting the old one would break those references.
     */
    public function replace(Request $request, string $id): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'max:20480']]);

        $media = MediaFile::where('public_id', $id)->firstOrFail();
        $file = $request->file('file');
        $type = $this->resolveType($file->getMimeType(), strtolower($file->getClientOriginalExtension()));

        if ($type !== $media->type) {
            return response()->json([
                'message' => "This file is a {$type}; the one it replaces is a {$media->type}.",
            ], 422);
        }

        $disk = Storage::disk($media->disk ?: 'public');
        // Overwrite in place at the recorded path so the public URL is unchanged.
        $disk->put($media->path, file_get_contents($file->getRealPath()));

        $dimensions = $media->dimensions;
        if ($type === 'image' && class_exists(\Intervention\Image\ImageManager::class)) {
            try {
                $img = \Intervention\Image\ImageManager::gd()->read($disk->path($media->path));
                $dimensions = $img->width().'x'.$img->height();
            } catch (\Throwable) {
                $dimensions = null;
            }
        }

        $media->update([
            'name' => $file->getClientOriginalName(),
            'mime' => $file->getMimeType(),
            'size' => $file->getSize(),
            'dimensions' => $dimensions,
        ]);

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

        return response()->json(['data' => ['folders' => $this->folderNames()]], 201);
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
