<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\FaqResource;
use App\Http\Resources\TestimonialResource;
use App\Models\Faq;
use App\Models\Testimonial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * FAQs and testimonials. These are dedicated tables (not JSON CMS sections)
 * because the admin reorders and toggles them individually.
 */
class ContentController extends Controller
{
    // ---- FAQs ----

    public function faqs(Request $request): JsonResponse
    {
        $query = Faq::query()->orderBy('order');
        if ($request->boolean('published_only')) {
            $query->where('published', true);
        }

        return response()->json(['data' => FaqResource::collection($query->get())]);
    }

    public function storeFaq(Request $request): JsonResponse
    {
        $data = $request->validate([
            'question' => ['required', 'string', 'max:512'],
            'answer' => ['required', 'string'],
            'order' => ['nullable', 'integer'],
            'published' => ['nullable', 'boolean'],
        ]);
        $data['order'] ??= (int) Faq::max('order') + 1;

        return response()->json(['data' => new FaqResource(Faq::create($data))], 201);
    }

    public function updateFaq(Request $request, int $id): JsonResponse
    {
        $faq = Faq::findOrFail($id);
        $faq->update($request->validate([
            'question' => ['sometimes', 'string', 'max:512'],
            'answer' => ['sometimes', 'string'],
            'order' => ['sometimes', 'integer'],
            'published' => ['sometimes', 'boolean'],
        ]));

        return response()->json(['data' => new FaqResource($faq->fresh())]);
    }

    public function destroyFaq(int $id): JsonResponse
    {
        Faq::findOrFail($id)->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function reorderFaqs(Request $request): JsonResponse
    {
        $data = $request->validate(['order' => ['required', 'array'], 'order.*' => ['integer']]);
        foreach ($data['order'] as $position => $id) {
            Faq::where('id', $id)->update(['order' => $position]);
        }

        return response()->json(['data' => FaqResource::collection(Faq::orderBy('order')->get())]);
    }

    // ---- Testimonials ----

    public function testimonials(Request $request): JsonResponse
    {
        $query = Testimonial::query()->orderBy('order');
        if ($request->boolean('published_only')) {
            $query->where('published', true);
        }

        return response()->json(['data' => TestimonialResource::collection($query->get())]);
    }

    public function storeTestimonial(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:255'],
            'quote' => ['required', 'string'],
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'avatar' => ['nullable', 'string', 'max:512'],
            'order' => ['nullable', 'integer'],
            'published' => ['nullable', 'boolean'],
        ]);
        $data['order'] ??= (int) Testimonial::max('order') + 1;
        $data['rating'] ??= 5;

        return response()->json(['data' => new TestimonialResource(Testimonial::create($data))], 201);
    }

    public function updateTestimonial(Request $request, int $id): JsonResponse
    {
        $t = Testimonial::findOrFail($id);
        $t->update($request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'role' => ['sometimes', 'string', 'max:255'],
            'quote' => ['sometimes', 'string'],
            'rating' => ['sometimes', 'integer', 'min:1', 'max:5'],
            'avatar' => ['sometimes', 'nullable', 'string', 'max:512'],
            'order' => ['sometimes', 'integer'],
            'published' => ['sometimes', 'boolean'],
        ]));

        return response()->json(['data' => new TestimonialResource($t->fresh())]);
    }

    public function destroyTestimonial(int $id): JsonResponse
    {
        Testimonial::findOrFail($id)->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
