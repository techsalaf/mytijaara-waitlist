{{-- Verification reminder. Deliberately the same skeleton as
     mail.waitlist-welcome (table layout, inline styles, #1f5c3a header, #f4e4bc
     accent, #25D366 WhatsApp button) so it reads as the same sender.

     What differs is the framing, and that is the point of the template: the
     opener names it as a reminder, the amber panel states plainly that the
     address is still unconfirmed, and the footer says exactly why this arrived
     and how to stop it. It never impersonates a first welcome. --}}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ $isFinal ? 'Last reminder: confirm your email' : 'Reminder: confirm your email for MyTijaara' }}</title>
</head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  {{-- Preheader: the inbox preview line. Sets the expectation before opening. --}}
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your email address is still unconfirmed, so we cannot reach you on launch day. One tap fixes it.
  </div>
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
              {{-- Reminder label. Removes any doubt about what this message is. --}}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
                <tr>
                  <td style="background:#faf8f3;border:1px solid #e8e2d5;border-radius:999px;padding:5px 12px;">
                    <span style="font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#6b5a2e;">
                      {{ $isFinal ? 'Final reminder' : 'Reminder' }}{{ $attempt > 1 ? ' · '.$attempt : '' }}
                    </span>
                  </td>
                </tr>
              </table>

              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">
                {{ $name }}, your email is still unconfirmed.
              </h1>

              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                You joined the MyTijaara waitlist{{ $joinedAgo ? ' '.$joinedAgo.' ago' : '' }} and we sent a
                confirmation link then. It has not been used yet, so
                <strong>your place is being held but we cannot email you on launch day</strong> —
                unconfirmed addresses are left out of every launch send.
              </p>

              @if ($verifyUrl)
                {{-- The one thing this email exists to get clicked. Amber panel so
                     it survives a skim-read on a phone. --}}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
                  <tr>
                    <td style="background:#f4e4bc;border-radius:12px;padding:20px;">
                      <p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#4a3d18;">
                        <strong>One tap and you are done.</strong> No password, no form.
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background:#1f5c3a;border-radius:8px;">
                            <a href="{{ $verifyUrl }}" style="display:inline-block;padding:13px 24px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Confirm my email</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#6b5a2e;">
                        Button not working? Paste this into your browser:<br>
                        <a href="{{ $verifyUrl }}" style="color:#1f5c3a;word-break:break-all;">{{ $verifyUrl }}</a>
                      </p>
                    </td>
                  </tr>
                </table>
              @else
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                  Reply to this email and we will send you a fresh confirmation link.
                </p>
              @endif

              {{-- What confirming actually protects. Carried over from the welcome
                   email so the reminder repeats the information that mattered. --}}
              <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                <strong>What you keep by confirming:</strong>
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                @if ($position)
                  <tr>
                    <td style="padding:0 0 8px;font-size:14px;line-height:1.55;color:#3f3f3f;">
                      &#8226;&nbsp; Your queue position <strong style="color:#1f5c3a;">#{{ $position }}</strong>, and early access ahead of the general launch.
                    </td>
                  </tr>
                @else
                  <tr>
                    <td style="padding:0 0 8px;font-size:14px;line-height:1.55;color:#3f3f3f;">
                      &#8226;&nbsp; Your place in the queue and early access ahead of the general launch.
                    </td>
                  </tr>
                @endif
                <tr>
                  <td style="padding:0 0 8px;font-size:14px;line-height:1.55;color:#3f3f3f;">
                    &#8226;&nbsp; Referral credit — only confirmed signups count, for you and for whoever invited you.
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 8px;font-size:14px;line-height:1.55;color:#3f3f3f;">
                    &#8226;&nbsp; Launch-day notice for
                    @if ($role === 'vendor') vendor onboarding
                    @elseif ($role === 'artisan') artisan onboarding
                    @elseif ($role === 'rider') rider onboarding
                    @else food, groceries, pharmacy, parcels, artisans and car rentals
                    @endif
                    in your city.
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                Already confirmed on another device? Then you are set — nothing else to do,
                and you will not get this reminder again.
              </p>

              <p style="margin:18px 0 8px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                Once you are confirmed, move up the queue by sharing your link:
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
                        <strong>Prefer WhatsApp?</strong> Join our official channel for launch updates and early access offers.
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
              <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#8a8a8a;">
                {{-- Why this arrived, stated exactly. --}}
                You are getting this because you joined the MyTijaara waitlist and your email
                address has not been confirmed yet. We send this reminder every
                {{ $intervalDays }} days until you confirm@if ($isFinal), and this is the last one@endif.
                Confirm and it stops immediately.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a8a;">
                Not interested any more?
                <a href="{{ $unsubscribeUrl }}" style="color:#8a8a8a;text-decoration:underline;">Unsubscribe</a>
                and we will stop emailing you.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
