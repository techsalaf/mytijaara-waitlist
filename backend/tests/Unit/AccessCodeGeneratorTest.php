<?php

namespace Tests\Unit;

use App\Services\DataRoom\AccessCodeGenerator;
use PHPUnit\Framework\TestCase;

/**
 * Gate tests for access code generation. Pure, no database, no HTTP.
 *
 * The alphabet assertions are the point: a code an investor mistypes because
 * O looked like 0 turns into a support ticket, and a code drawn from a
 * predictable source turns into an unauthorized visitor.
 */
class AccessCodeGeneratorTest extends TestCase
{
    private AccessCodeGenerator $codes;

    protected function setUp(): void
    {
        parent::setUp();
        $this->codes = new AccessCodeGenerator();
    }

    public function test_alphabet_excludes_every_ambiguous_character(): void
    {
        foreach (['O', '0', 'I', '1', 'S', '5', 'B', '8', 'L', 'Z', '2', 'U'] as $char) {
            $this->assertStringNotContainsString(
                $char,
                AccessCodeGenerator::ALPHABET,
                "Ambiguous character {$char} must not be in the code alphabet."
            );
        }

        $this->assertSame(
            strlen(AccessCodeGenerator::ALPHABET),
            count(array_unique(str_split(AccessCodeGenerator::ALPHABET))),
            'The alphabet must not repeat a character, which would skew the distribution.'
        );
    }

    public function test_generated_codes_match_the_documented_shape(): void
    {
        for ($i = 0; $i < 200; $i++) {
            $code = $this->codes->generate();

            $this->assertMatchesRegularExpression(
                '/^MTJ-['.AccessCodeGenerator::ALPHABET.']{4}-['.AccessCodeGenerator::ALPHABET.']{4}$/',
                $code,
                "Generated code {$code} does not match MTJ-XXXX-XXXX over the safe alphabet."
            );
        }
    }

    public function test_generated_codes_are_never_a_guessable_placeholder(): void
    {
        $banned = ['MTJ-1234-5678', '123456', '000000', 'INVESTOR', 'MYTIJAARA'];

        for ($i = 0; $i < 200; $i++) {
            $this->assertNotContains($this->codes->generate(), $banned);
        }
    }

    public function test_generated_codes_do_not_repeat_across_a_large_sample(): void
    {
        $codes = [];

        for ($i = 0; $i < 2000; $i++) {
            $codes[] = $this->codes->generate();
        }

        // 24^8 is roughly 1.1e11, so 2000 draws colliding would mean the source
        // is not behaving like a CSPRNG.
        $this->assertCount(2000, array_unique($codes));
    }

    public function test_normalize_repairs_what_a_visitor_realistically_pastes(): void
    {
        $this->assertSame('MTJ-8F4K-92QX', $this->codes->normalize('  mtj-8f4k-92qx '));
        // En dash and em dash, which mail clients and word processors substitute.
        $this->assertSame('MTJ-8F4K-92QX', $this->codes->normalize("mtj\u{2013}8f4k\u{2014}92qx"));
        $this->assertSame('MTJ-8F4K-92QX', $this->codes->normalize('MTJ 8F4K 92QX'));
    }

    public function test_hint_is_the_last_four_characters_only(): void
    {
        $this->assertSame('92QX', $this->codes->hint('MTJ-8F4K-92QX'));
        $this->assertSame(4, strlen($this->codes->hint($this->codes->generate())));
    }
}
