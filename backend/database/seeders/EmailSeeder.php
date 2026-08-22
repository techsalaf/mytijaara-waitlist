<?php

namespace Database\Seeders;

use App\Models\EmailCampaign;
use App\Models\EmailTemplate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class EmailSeeder extends Seeder
{
    /** Templates + campaigns mirror src/lib/mock-data.ts. */
    public function run(): void
    {
        $templates = [
            // tpl_1: Welcome Email — production-ready content matching waitlist-welcome.blade.php
            ['public_id' => 'tpl_1', 'name' => 'Welcome Email', 'category' => 'onboarding', 'thumbnail' => 'welcome', 'subject' => "You're on the list!", 'html' => File::get(base_path('resources/views/mail/waitlist-welcome.blade.php')), 'text' => 'You\'re in, {{ $name }}. Your position is #{{ $position }}. Confirm my email at {{ $verifyUrl }}. Referral: {{ $referralUrl }}.'],

            // tpl_2: Referral Bonus — matches referral-reward.blade.php + robust modules
            ['public_id' => 'tpl_2', 'name' => 'Referral Bonus', 'category' => 'engagement', 'thumbnail' => 'referral', 'subject' => 'Earn ₦500 for every friend', 'html' => $this->referralBonusHtml(), 'text' => '{{ $referrals }} of your referral{{ $referrals === 1 ? "" : "s" }} have been confirmed, so your referral reward has been approved. Reward: {{ $amount }} for {{ $referrals }} confirmed referral{{ $referrals === 1 ? "" : "s" }}.'],

            // tpl_3: Early Access — launch invitation with full modules
            ['public_id' => 'tpl_3', 'name' => 'Early Access', 'category' => 'launch', 'thumbnail' => 'invite', 'subject' => "You're first in line", 'html' => $this->earlyAccessHtml(), 'text' => 'Your spot as a {{ $role }} on MyTijaara is reserved. Confirm my email at {{ $verifyUrl }}.'],

            // tpl_4: Vendor Onboarding — with full modules
            ['public_id' => 'tpl_4', 'name' => 'Vendor Onboarding', 'category' => 'onboarding', 'thumbnail' => 'vendor', 'subject' => 'Grow your business with MyTijaara', 'html' => $this->vendorOnboardingHtml(), 'text' => 'Welcome to the MyTijaara vendor platform. Your spot as a vendor is reserved. We\'ll reach out with onboarding details before launch.'],

            // tpl_5: Product Update — newsletter with full modules
            ['public_id' => 'tpl_5', 'name' => 'Product Update', 'category' => 'newsletter', 'thumbnail' => 'update', 'subject' => "What\'s new this month", 'html' => $this->productUpdateHtml(), 'text' => 'Hi {{ $firstName }}, here\'s what\'s new this month on MyTijaara: New features and improvements. Updated vendor tools. Expanded delivery zones. Stay tuned for more updates!'],

            // tpl_6: Password Reset — transactional with full modules
            ['public_id' => 'tpl_6', 'name' => 'Password Reset', 'category' => 'transactional', 'thumbnail' => 'reset', 'subject' => 'Reset your password', 'html' => $this->passwordResetHtml(), 'text' => 'You requested a password reset for your MyTijaara account. Reset your password at {{ $resetLink }}. If you didn\'t request this, please ignore this email.'],
        ];
        foreach ($templates as $t) {
            EmailTemplate::firstOrCreate(['public_id' => $t['public_id']], $t);
        }
    }

    private function referralBonusHtml(): string
    {
        return <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your referral reward has been approved</title>
</head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d5;">
          <tr>
            <td style="background:#1f5c3a;padding:22px 28px;">
              @if ($logoUrl)
                <img src="{{ $logoUrl }}" alt="{{ $siteName }}" style="height:32px;width:auto;display:block;">
              @else
                <span style="color:#f4e4bc;font-size:20px;font-weight:700;letter-spacing:-0.2px;">{{ $siteName }}</span>
              @endif
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Your referral reward is ready, {{ $name }}!</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                {{ $referrals }} of your referral{{ $referrals === 1 ? "" : "s" }} have been confirmed, so your referral reward has been approved.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#faf8f3;border:1px solid #e8e2d5;border-radius:10px;width:100%;">
                <tr>
                  <td style="padding:18px 20px;">
                    <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#8a8a8a;">Reward</div>
                    <div style="margin-top:6px;font-size:28px;font-weight:700;color:#1f5c3a;">{{ $amount }}</div>
                    <div style="margin-top:4px;font-size:13px;color:#6b6b6b;">for {{ $referrals }} confirmed referral{{ $referrals === 1 ? "" : "s" }}</div>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                Keep sharing your link. Every friend who joins and confirms their email pushes you higher.
              </p>
              <p style="margin:0 0 8px;">
                <a href="{{ $referralUrl }}" style="font-size:14px;color:#1f5c3a;word-break:break-all;">{{ $referralUrl }}</a>
              </p>
              @if (!empty($benefitsUrl))
                <p style="margin:0 0 24px;font-size:13px;color:#6b6b6b;">
                  🎁 <a href="{{ $benefitsUrl }}" style="color:#1f5c3a;font-weight:600;text-decoration:underline;">See what you unlock at 10 referrals &rarr;</a>
                </p>
              @endif
              @if ($whatsappChannelUrl)
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid #e8e2d5;padding-top:20px;">
                  <tr>
                    <td>
                      <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                        <strong>Stay in the loop</strong> — join our official WhatsApp channel for launch updates, exclusive previews, and early access offers.
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background:#25D366;border-radius:8px;">
                            <a href="{{ $whatsappChannelUrl }}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Join WhatsApp Channel</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              @endif
              <p style="margin:0;font-size:14px;line-height:1.6;color:#6b6b6b;">
                See you at launch,<br>The MyTijaara team
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f3;padding:16px 28px;border-top:1px solid #e8e2d5;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a8a;">
                You received this because you joined the MyTijaara waitlist.
                <a href="{{ $unsubscribeUrl }}" style="color:#8a8a8a;text-decoration:underline;">Unsubscribe</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
    }

    private function earlyAccessHtml(): string
    {
        return <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>You're first in line</title>
</head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d5;">
          <tr>
            <td style="background:#1f5c3a;padding:22px 28px;">
              @if ($logoUrl)
                <img src="{{ $logoUrl }}" alt="{{ $siteName }}" style="height:32px;width:auto;display:block;">
              @else
                <span style="color:#f4e4bc;font-size:20px;font-weight:700;letter-spacing:-0.2px;">{{ $siteName }}</span>
              @endif
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">You're first in line, {{ $name }}</h1>
              @if ($role === 'vendor')
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                  Your spot as a <strong>vendor</strong> on MyTijaara is reserved. We'll reach out with
                  onboarding details before launch so you can list your products from day one.
                </p>
              @elseif ($role === 'artisan')
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                  Your spot as an <strong>artisan</strong> on MyTijaara is reserved. We connect skilled
                  professionals like you with Nigerians who need reliable, vetted service providers.
                </p>
              @elseif ($role === 'rider')
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                  Your spot as a <strong>delivery rider</strong> on MyTijaara is reserved. We'll send
                  you everything you need to start earning on the platform before we go live.
                </p>
              @else
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                  Thanks for joining the MyTijaara waitlist. One app for food, shopping,
                  deliveries and trusted services across Nigeria.
                </p>
              @endif
              @if ($position)
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="background:#f4e4bc;border-radius:10px;padding:14px 18px;">
                      <span style="font-size:13px;color:#6b5a2e;display:block;">Your position</span>
                      <span style="font-size:24px;font-weight:700;color:#1f5c3a;">#{{ $position }}</span>
                    </td>
                  </tr>
                </table>
              @endif
              @if ($verifyUrl)
                <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                  Confirm your email so we can reach you on launch day:
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
                  <tr>
                    <td style="background:#1f5c3a;border-radius:8px;">
                      <a href="{{ $verifyUrl }}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Confirm my email</a>
                    </td>
                  </tr>
                </table>
              @endif
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                Move up the queue by sharing your link. Every friend who joins and
                confirms their email pushes you higher.
              </p>
              <p style="margin:0 0 8px;">
                <a href="{{ $referralUrl }}" style="font-size:14px;color:#1f5c3a;word-break:break-all;">{{ $referralUrl }}</a>
              </p>
              @if (!empty($benefitsUrl))
                <p style="margin:0 0 24px;font-size:13px;color:#6b6b6b;">
                  🎁 <a href="{{ $benefitsUrl }}" style="color:#1f5c3a;font-weight:600;text-decoration:underline;">See what you unlock at 10 referrals &rarr;</a>
                </p>
              @endif
              @if ($whatsappChannelUrl)
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid #e8e2d5;padding-top:20px;">
                  <tr>
                    <td>
                      <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                        <strong>Stay in the loop</strong> — join our official WhatsApp channel for launch updates, exclusive previews, and early access offers.
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background:#25D366;border-radius:8px;">
                            <a href="{{ $whatsappChannelUrl }}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Join WhatsApp Channel</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              @endif
              <p style="margin:0;font-size:14px;line-height:1.6;color:#6b6b6b;">
                See you at launch,<br>The MyTijaara team
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f3;padding:16px 28px;border-top:1px solid #e8e2d5;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a8a;">
                You received this because you joined the MyTijaara waitlist.
                <a href="{{ $unsubscribeUrl }}" style="color:#8a8a8a;text-decoration:underline;">Unsubscribe</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
    }

    private function vendorOnboardingHtml(): string
    {
        return <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to the MyTijaara Vendor Platform</title>
</head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d5;">
          <tr>
            <td style="background:#1f5c3a;padding:22px 28px;">
              @if ($logoUrl)
                <img src="{{ $logoUrl }}" alt="{{ $siteName }}" style="height:32px;width:auto;display:block;">
              @else
                <span style="color:#f4e4bc;font-size:20px;font-weight:700;letter-spacing:-0.2px;">{{ $siteName }}</span>
              @endif
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Welcome to the Vendor Platform, {{ $name }}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                Welcome to the MyTijaara vendor platform! We're excited to help you grow your business and reach more customers across Nigeria.
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                Your spot as a vendor on MyTijaara is reserved. We'll reach out with onboarding details before launch so you can list your products from day one.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                What you can expect:
              </p>
              <ul style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.8;color:#3f3f3f;">
                <li>Easy product listing and inventory management</li>
                <li>Integrated delivery and logistics</li>
                <li>Transparent analytics and sales reporting</li>
                <li>Direct customer communication</li>
              </ul>
              @if ($verifyUrl)
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">
                  <tr>
                    <td style="background:#D4A017;border-radius:8px;">
                      <a href="{{ $verifyUrl }}" style="display:inline-block;padding:12px 22px;color:#000000;font-size:15px;font-weight:600;text-decoration:none;">Confirm my email</a>
                    </td>
                  </tr>
                </table>
              @endif
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                Move up the queue by sharing your link. Every friend who joins and
                confirms their email pushes you higher.
              </p>
              <p style="margin:0 0 8px;">
                <a href="{{ $referralUrl }}" style="font-size:14px;color:#1f5c3a;word-break:break-all;">{{ $referralUrl }}</a>
              </p>
              @if (!empty($benefitsUrl))
                <p style="margin:0 0 24px;font-size:13px;color:#6b6b6b;">
                  🎁 <a href="{{ $benefitsUrl }}" style="color:#1f5c3a;font-weight:600;text-decoration:underline;">See what you unlock at 10 referrals &rarr;</a>
                </p>
              @endif
              @if ($whatsappChannelUrl)
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid #e8e2d5;padding-top:20px;">
                  <tr>
                    <td>
                      <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                        <strong>Stay in the loop</strong> — join our official WhatsApp channel for launch updates, exclusive previews, and early access offers.
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background:#25D366;border-radius:8px;">
                            <a href="{{ $whatsappChannelUrl }}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Join WhatsApp Channel</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              @endif
              <p style="margin:0;font-size:14px;line-height:1.6;color:#6b6b6b;">
                See you at launch,<br>The MyTijaara team
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f3;padding:16px 28px;border-top:1px solid #e8e2d5;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a8a;">
                You received this because you joined the MyTijaara waitlist.
                <a href="{{ $unsubscribeUrl }}" style="color:#8a8a8a;text-decoration:underline;">Unsubscribe</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
    }

    private function productUpdateHtml(): string
    {
        return <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>What's new this month</title>
</head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d5;">
          <tr>
            <td style="background:#1f5c3a;padding:22px 28px;">
              @if ($logoUrl)
                <img src="{{ $logoUrl }}" alt="{{ $siteName }}" style="height:32px;width:auto;display:block;">
              @else
                <span style="color:#f4e4bc;font-size:20px;font-weight:700;letter-spacing:-0.2px;">{{ $siteName }}</span>
              @endif
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">What's new this month, {{ $firstName }}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                Here's what's new this month on MyTijaara:
              </p>
              <ul style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.8;color:#3f3f3f;">
                <li>New features and improvements to the waitlist experience</li>
                <li>Updated vendor tools for faster product management</li>
                <li>Expanded delivery zones across major Nigerian cities</li>
                <li>Enhanced referral rewards program</li>
              </ul>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">
                <tr>
                  <td style="background:#1f5c3a;border-radius:8px;">
                    <a href="https://mytijaara.com" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Visit MyTijaara</a>
                  </td>
                </tr>
              </table>
              @if ($referralUrl)
                <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                  Move up the queue by sharing your link. Every friend who joins and
                  confirms their email pushes you higher.
                </p>
                <p style="margin:0 0 8px;">
                  <a href="{{ $referralUrl }}" style="font-size:14px;color:#1f5c3a;word-break:break-all;">{{ $referralUrl }}</a>
                </p>
                @if (!empty($benefitsUrl))
                  <p style="margin:0 0 24px;font-size:13px;color:#6b6b6b;">
                    🎁 <a href="{{ $benefitsUrl }}" style="color:#1f5c3a;font-weight:600;text-decoration:underline;">See what you unlock at 10 referrals &rarr;</a>
                  </p>
                @endif
              @endif
              @if ($whatsappChannelUrl)
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid #e8e2d5;padding-top:20px;">
                  <tr>
                    <td>
                      <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                        <strong>Stay in the loop</strong> — join our official WhatsApp channel for launch updates, exclusive previews, and early access offers.
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background:#25D366;border-radius:8px;">
                            <a href="{{ $whatsappChannelUrl }}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Join WhatsApp Channel</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              @endif
              <p style="margin:0;font-size:14px;line-height:1.6;color:#6b6b6b;">
                See you at launch,<br>The MyTijaara team
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f3;padding:16px 28px;border-top:1px solid #e8e2d5;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a8a;">
                You received this because you joined the MyTijaara waitlist.
                <a href="{{ $unsubscribeUrl }}" style="color:#8a8a8a;text-decoration:underline;">Unsubscribe</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
    }

    private function passwordResetHtml(): string
    {
        return <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d5;">
          <tr>
            <td style="background:#1f5c3a;padding:22px 28px;">
              @if ($logoUrl)
                <img src="{{ $logoUrl }}" alt="{{ $siteName }}" style="height:32px;width:auto;display:block;">
              @else
                <span style="color:#f4e4bc;font-size:20px;font-weight:700;letter-spacing:-0.2px;">{{ $siteName }}</span>
              @endif
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Reset Your Password</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                You requested a password reset for your MyTijaara account.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">
                <tr>
                  <td style="background:#1f5c3a;border-radius:8px;">
                    <a href="{{ $resetLink }}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Reset my password</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#666666;">
                This link expires in 60 minutes. If you didn't request this, please ignore this email or contact support if you have concerns.
              </p>
              @if ($whatsappChannelUrl)
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid #e8e2d5;padding-top:20px;">
                  <tr>
                    <td>
                      <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                        <strong>Stay in the loop</strong> — join our official WhatsApp channel for launch updates, exclusive previews, and early access offers.
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background:#25D366;border-radius:8px;">
                            <a href="{{ $whatsappChannelUrl }}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Join WhatsApp Channel</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              @endif
              <p style="margin:0;font-size:14px;line-height:1.6;color:#6b6b6b;">
                The MyTijaara team
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f3;padding:16px 28px;border-top:1px solid #e8e2d5;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a8a;">
                You received this because you joined the MyTijaara waitlist.
                <a href="{{ $unsubscribeUrl }}" style="color:#8a8a8a;text-decoration:underline;">Unsubscribe</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
    }
}

        $campaigns = [
            ['public_id' => 'cmp_001', 'name' => 'Welcome to MyTijaara', 'status' => 'sent', 'subject' => "You're on the list! Here's what's next 🎉", 'sent' => 1847, 'recipients' => 1847, 'opens' => 890, 'clicks' => 234, 'sent_at' => '2026-07-18', 'template' => 'tpl_1'],
            ['public_id' => 'cmp_002', 'name' => 'Early Access Invite — Lagos', 'status' => 'sent', 'subject' => "Lagos, you're first. Try MyTijaara today.", 'sent' => 892, 'recipients' => 892, 'opens' => 512, 'clicks' => 187, 'sent_at' => '2026-07-14', 'template' => 'tpl_3'],
            ['public_id' => 'cmp_003', 'name' => 'Referral Bonus Reminder', 'status' => 'scheduled', 'subject' => '3 friends away from your ₦5,000 bonus', 'sent' => 0, 'recipients' => 0, 'opens' => 0, 'clicks' => 0, 'scheduled_at' => '2026-07-26', 'template' => 'tpl_2'],
            ['public_id' => 'cmp_004', 'name' => 'Product Update — August', 'status' => 'draft', 'subject' => 'New: Book artisans in seconds', 'sent' => 0, 'recipients' => 0, 'opens' => 0, 'clicks' => 0, 'template' => 'tpl_5'],
            ['public_id' => 'cmp_005', 'name' => 'Vendor Onboarding Series', 'status' => 'sent', 'subject' => 'Grow your business with MyTijaara', 'sent' => 342, 'recipients' => 342, 'opens' => 198, 'clicks' => 76, 'sent_at' => '2026-07-10', 'template' => 'tpl_4'],
        ];
        foreach ($campaigns as $c) {
            $templateId = EmailTemplate::where('public_id', $c['template'])->value('id');
            EmailCampaign::firstOrCreate(['public_id' => $c['public_id']], [
                'name' => $c['name'],
                'subject' => $c['subject'],
                'html' => '<p>'.$c['name'].'</p>',
                'status' => $c['status'],
                'template_id' => $templateId,
                'recipients' => $c['recipients'],
                'sent' => $c['sent'],
                'opens' => $c['opens'],
                'clicks' => $c['clicks'],
                'bounces' => 0,
                'scheduled_at' => $c['scheduled_at'] ?? null,
                'sent_at' => $c['sent_at'] ?? null,
            ]);
        }
    }
}
