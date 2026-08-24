<?php

namespace Database\Seeders;

use App\Models\EmailCampaign;
use App\Models\EmailTemplate;
use Illuminate\Database\Seeder;

class EmailSeeder extends Seeder
{
    /** Seeds production-ready email templates. Zero mock campaigns. */
    public function run(): void
    {
        $templates = [
            // tpl_1: Welcome Email
            [
                'public_id' => 'tpl_1',
                'name' => 'Welcome Email',
                'category' => 'onboarding',
                'thumbnail' => 'welcome',
                'subject' => "You're on the list! Here's what's next 🎉",
                'html' => $this->welcomeHtml(),
                'text' => "Welcome to MyTijaara, {{name}}! Your waitlist spot is reserved. Confirm your email at {{verifyUrl}} and invite friends with your referral link: {{referralUrl}}.",
            ],

            // tpl_2: Referral Bonus
            [
                'public_id' => 'tpl_2',
                'name' => 'Referral Bonus',
                'category' => 'engagement',
                'thumbnail' => 'referral',
                'subject' => 'Earn ₦500 for every friend you refer',
                'html' => $this->referralBonusHtml(),
                'text' => "Your referral reward is ready, {{name}}! You have {{referrals}} confirmed referrals. Keep sharing your link: {{referralUrl}} to earn more.",
            ],

            // tpl_3: Early Access
            [
                'public_id' => 'tpl_3',
                'name' => 'Early Access',
                'category' => 'launch',
                'thumbnail' => 'invite',
                'subject' => "You're first in line — Early access is almost here",
                'html' => $this->earlyAccessHtml(),
                'text' => "You're first in line, {{name}}! Early access to MyTijaara is almost here. Get ready to experience food delivery, grocery shopping, artisans, and more in one app.",
            ],

            // tpl_4: Vendor Onboarding
            [
                'public_id' => 'tpl_4',
                'name' => 'Vendor Onboarding',
                'category' => 'onboarding',
                'thumbnail' => 'vendor',
                'subject' => 'Grow your business with MyTijaara — Partner Onboarding',
                'html' => $this->vendorOnboardingHtml(),
                'text' => "Welcome to MyTijaara for Partners, {{name}}! Reach thousands of customers in your city with prompt weekly payouts and dedicated seller tools.",
            ],

            // tpl_5: Product Update
            [
                'public_id' => 'tpl_5',
                'name' => 'Product Update',
                'category' => 'newsletter',
                'thumbnail' => 'update',
                'subject' => "What's new on MyTijaara this month 🚀",
                'html' => $this->productUpdateHtml(),
                'text' => "Hi {{first_name}}, here is what's new on MyTijaara: One-tap artisan booking, expanded delivery coverage in Lagos & Abuja, and escrow-protected payments.",
            ],

            // tpl_6: Password Reset
            [
                'public_id' => 'tpl_6',
                'name' => 'Password Reset',
                'category' => 'transactional',
                'thumbnail' => 'reset',
                'subject' => 'Reset your password — MyTijaara',
                'html' => $this->passwordResetHtml(),
                'text' => "We received a request to reset your password for your MyTijaara account. Reset your password at: {{resetLink}}. This link expires in 60 minutes.",
            ],
        ];

        foreach ($templates as $t) {
            $data = $t;
            unset($data['public_id']);
            EmailTemplate::withTrashed()->updateOrCreate(['public_id' => $t['public_id']], $data);
        }

        // Production rule: No mock campaigns seeded. Campaigns table starts clean.
    }

    private function welcomeHtml(): string
    {
        return <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to MyTijaara</title>
</head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d5;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
          <tr>
            <td style="background:#004a28;padding:22px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#d4a017;border-radius:8px;padding:6px 12px;font-weight:bold;color:#004a28;font-size:16px;">M</td>
                  <td style="padding-left:12px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">MyTijaara</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 20px;">
              <div style="display:inline-block;background:#fef9e7;border:1px solid #f2e3b6;color:#8f6804;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 10px;border-radius:20px;margin-bottom:14px;">
                🎉 Priority Waitlist Confirmed
              </div>
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#004a28;">You're on the list, {{name}}!</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                Thanks for joining MyTijaara — the all-in-one platform built for everyday life in Nigeria. Order food, buy groceries and pharmacy items, book trusted artisans, send parcels, and rent cars from one single app.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;width:100%;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#166534;font-weight:600;">Your Waitlist Position</div>
                    <div style="margin-top:4px;font-size:24px;font-weight:800;color:#004a28;">#{{position}}</div>
                    <div style="margin-top:4px;font-size:13px;color:#15803d;">You have priority access before the public launch in your city.</div>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#004a28;border-radius:8px;">
                    <a href="{{verifyUrl}}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">Confirm My Email &rarr;</a>
                  </td>
                </tr>
              </table>
              <div style="border-top:1px solid #e8e2d5;padding-top:20px;margin-top:20px;">
                <h3 style="margin:0 0 8px;font-size:16px;color:#1a1a1a;">Move up the list & earn cash rewards</h3>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#555555;">
                  Share your unique referral link with friends, family, and colleagues. You'll jump the queue and earn <strong>₦500</strong> for every verified signup!
                </p>
                <div style="background:#faf8f3;border:1px dashed #d4a017;padding:12px 16px;border-radius:8px;font-size:13px;word-break:break-all;color:#004a28;font-weight:600;">
                  {{referralUrl}}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f3;padding:18px 28px;border-top:1px solid #e8e2d5;font-size:12px;line-height:1.5;color:#8a8a8a;text-align:center;">
              <p style="margin:0 0 4px;">Sent with ❤️ by <strong>MyTijaara Ltd</strong>, Lagos, Nigeria.</p>
              <p style="margin:0;"><a href="{{unsubscribe}}" style="color:#8a8a8a;text-decoration:underline;">Unsubscribe</a> from email updates</p>
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

    private function referralBonusHtml(): string
    {
        return <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your referral reward is ready</title>
</head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d5;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
          <tr>
            <td style="background:#004a28;padding:22px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#d4a017;border-radius:8px;padding:6px 12px;font-weight:bold;color:#004a28;font-size:16px;">M</td>
                  <td style="padding-left:12px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">MyTijaara</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#004a28;">Your referral reward is ready, {{name}}!</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                Your friends are joining the waitlist! You currently have <strong>{{referrals}}</strong> confirmed referrals registered under your account.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#faf8f3;border:1px solid #e8e2d5;border-radius:10px;width:100%;">
                <tr>
                  <td style="padding:18px 20px;">
                    <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#8a8a8a;font-weight:600;">Reward Balance</div>
                    <div style="margin-top:6px;font-size:28px;font-weight:700;color:#004a28;">{{amount}}</div>
                    <div style="margin-top:4px;font-size:13px;color:#6b6b6b;">earned from {{referrals}} confirmed referral signups</div>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                Keep sharing your unique referral link. Every friend who confirms their email pushes you higher up the queue:
              </p>
              <p style="margin:0 0 20px;">
                <a href="{{referralUrl}}" style="font-size:14px;color:#004a28;font-weight:600;word-break:break-all;">{{referralUrl}}</a>
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#d4a017;border-radius:8px;">
                    <a href="{{referralUrl}}" style="display:inline-block;padding:14px 28px;color:#004a28;font-size:15px;font-weight:700;text-decoration:none;">Share My Referral Link</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#6b6b6b;">
                See you at launch,<br><strong>The MyTijaara Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f3;padding:16px 28px;border-top:1px solid #e8e2d5;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a8a;">
                You received this because you joined the MyTijaara waitlist.
                <a href="{{unsubscribe}}" style="color:#8a8a8a;text-decoration:underline;">Unsubscribe</a>.
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
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d5;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
          <tr>
            <td style="background:#004a28;padding:22px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#d4a017;border-radius:8px;padding:6px 12px;font-weight:bold;color:#004a28;font-size:16px;">M</td>
                  <td style="padding-left:12px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">MyTijaara</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <div style="display:inline-block;background:#fef9e7;border:1px solid #f2e3b6;color:#8f6804;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 10px;border-radius:20px;margin-bottom:14px;">
                🚀 Early Access Alert
              </div>
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#004a28;">You're first in line, {{name}}!</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                We are putting the final touches on MyTijaara. Because of your priority spot on the waitlist, you'll be among the very first to test the app before anyone else.
              </p>
              <div style="background:#faf8f3;border:1px solid #e8e2d5;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
                <h4 style="margin:0 0 8px;font-size:15px;color:#004a28;">Here is what's waiting for you:</h4>
                <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;color:#4a4a4a;">
                  <li><strong>Fast food & grocery delivery</strong> from vendors in your neighborhood</li>
                  <li><strong>Vetted artisans</strong> — plumbers, electricians, carpenters on demand</li>
                  <li><strong>Same-day parcel deliveries</strong> across your city</li>
                  <li><strong>Seamless payments</strong> via bank transfer, card, or pay-on-delivery</li>
                </ul>
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#004a28;border-radius:8px;">
                    <a href="{{verifyUrl}}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Claim Early Access &rarr;</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#6b6b6b;">
                Warm regards,<br><strong>The MyTijaara Launch Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f3;padding:16px 28px;border-top:1px solid #e8e2d5;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a8a;">
                You received this because you joined the MyTijaara waitlist.
                <a href="{{unsubscribe}}" style="color:#8a8a8a;text-decoration:underline;">Unsubscribe</a>.
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
  <title>Grow your business with MyTijaara</title>
</head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d5;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
          <tr>
            <td style="background:#004a28;padding:22px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#d4a017;border-radius:8px;padding:6px 12px;font-weight:bold;color:#004a28;font-size:16px;">M</td>
                  <td style="padding-left:12px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">MyTijaara for Partners</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#004a28;">Welcome to MyTijaara, {{name}}!</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                Your spot as a verified business partner on MyTijaara is registered. Whether you sell groceries, run a restaurant, offer artisan services, or provide logistics, MyTijaara connects you with thousands of paying customers in your city.
              </p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
                <h4 style="margin:0 0 8px;font-size:15px;color:#166534;">Why partner with MyTijaara?</h4>
                <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;color:#15803d;">
                  <li><strong>Zero upfront listing fees</strong> — only pay a tiny commission when you earn</li>
                  <li><strong>Fast weekly payouts</strong> directly into your Nigerian bank account</li>
                  <li><strong>Instant customer notifications</strong> on your smartphone</li>
                  <li><strong>Dedicated support team</strong> available 24/7 in Nigeria</li>
                </ul>
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#004a28;border-radius:8px;">
                    <a href="{{verifyUrl}}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Complete Partner Profile &rarr;</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#6b6b6b;">
                Excited to build with you,<br><strong>The MyTijaara Merchant Operations Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f3;padding:16px 28px;border-top:1px solid #e8e2d5;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a8a;">
                You received this because you registered as a merchant/partner on MyTijaara.
                <a href="{{unsubscribe}}" style="color:#8a8a8a;text-decoration:underline;">Unsubscribe</a>.
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
  <title>What's new on MyTijaara this month</title>
</head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d5;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
          <tr>
            <td style="background:#004a28;padding:22px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#d4a017;border-radius:8px;padding:6px 12px;font-weight:bold;color:#004a28;font-size:16px;">M</td>
                  <td style="padding-left:12px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">MyTijaara Product Update</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#004a28;">What's new on MyTijaara this month 🚀</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                Hi {{first_name}}, here is our latest progress report as we prepare for the official launch across Nigeria. Here are the highlights:
              </p>
              <div style="background:#faf8f3;border:1px solid #e8e2d5;border-radius:10px;padding:18px 20px;margin-bottom:16px;">
                <h4 style="margin:0 0 4px;font-size:15px;color:#004a28;">⚡ Expanded City Coverage</h4>
                <p style="margin:0;font-size:14px;line-height:1.5;color:#555555;">
                  We have mapped out over 250 verified merchant zones in Lagos, Abuja, and Port Harcourt for same-day express delivery.
                </p>
              </div>
              <div style="background:#faf8f3;border:1px solid #e8e2d5;border-radius:10px;padding:18px 20px;margin-bottom:16px;">
                <h4 style="margin:0 0 4px;font-size:15px;color:#004a28;">🔧 Verified Artisan Network</h4>
                <p style="margin:0;font-size:14px;line-height:1.5;color:#555555;">
                  Over 500 licensed plumbers, electricians, and technicians have successfully completed our background checks.
                </p>
              </div>
              <div style="background:#faf8f3;border:1px solid #e8e2d5;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
                <h4 style="margin:0 0 4px;font-size:15px;color:#004a28;">🛡️ Secure Naira Escrow</h4>
                <p style="margin:0;font-size:14px;line-height:1.5;color:#555555;">
                  Every order is protected by our automated escrow system — funds are only released when you confirm satisfactory delivery.
                </p>
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#004a28;border-radius:8px;">
                    <a href="{{referralUrl}}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Invite Friends & Move Up</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#6b6b6b;">
                Thank you for being part of this journey,<br><strong>The MyTijaara Product Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f3;padding:16px 28px;border-top:1px solid #e8e2d5;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a8a;">
                You received this because you subscribed to MyTijaara updates.
                <a href="{{unsubscribe}}" style="color:#8a8a8a;text-decoration:underline;">Unsubscribe</a>.
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
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d5;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
          <tr>
            <td style="background:#004a28;padding:22px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#d4a017;border-radius:8px;padding:6px 12px;font-weight:bold;color:#004a28;font-size:16px;">M</td>
                  <td style="padding-left:12px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">MyTijaara Security</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#004a28;">Password Reset Request</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                We received a request to reset the password for your MyTijaara account (<strong>{{email}}</strong>). Click the button below to set a new password:
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#004a28;border-radius:8px;">
                    <a href="{{resetLink}}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Reset My Password &rarr;</a>
                  </td>
                </tr>
              </table>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#991b1b;">
                  ⚠️ <strong>Security Notice:</strong> This password reset link is only valid for <strong>60 minutes</strong>. If you did not request this change, please ignore this email — your account password will remain unchanged.
                </p>
              </div>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#6b6b6b;">
                Best regards,<br><strong>MyTijaara Security Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f3;padding:16px 28px;border-top:1px solid #e8e2d5;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a8a;">
                Automated security message from MyTijaara Ltd.
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
