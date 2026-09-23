{{-- Launch Pass Announcement Email. Table layout + inline styles for bulletproof mail client rendering. --}}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your MyTijaara Launch Pass is ready</title>
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
              {{-- Announcement Badge --}}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
                <tr>
                  <td style="background:#edf7f0;border:1px solid #c2e5d0;border-radius:20px;padding:5px 14px;">
                    <span style="font-size:12px;font-weight:700;color:#1f5c3a;letter-spacing:0.5px;text-transform:uppercase;">🚀 Official Launch Announcement</span>
                  </td>
                </tr>
              </table>

              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#1a1a1a;">
                {{ $firstName }}, your MyTijaara Launch Pass is ready!
              </h1>

              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                We are thrilled to officially announce that <strong>MyTijaara</strong> will launch live on 
                <strong>{{ $eventDate }}</strong> during the <strong>{{ $eventName }}</strong>!
              </p>

              {{-- Personalized Launch Pass Hero Card --}}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#05160E;border-radius:12px;border:1px solid #f4e4bc;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;background:linear-gradient(135deg, #05160E 0%, #0A2418 100%);">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <span style="font-size:11px;font-weight:700;color:#f4e4bc;letter-spacing:1px;text-transform:uppercase;display:block;">Digital Launch Pass</span>
                          <span style="font-size:18px;font-weight:700;color:#ffffff;display:block;margin-top:2px;">{{ $name }}</span>
                          <span style="font-size:12px;color:#a3c9b4;display:block;margin-top:2px;">{{ $eventDate }} • {{ $eventName }}</span>
                        </td>
                        @if ($position)
                          <td align="right" style="vertical-align:middle;">
                            <span style="display:inline-block;background:rgba(244,228,188,0.15);border:1px solid #f4e4bc;border-radius:8px;padding:6px 12px;color:#f4e4bc;font-size:14px;font-weight:700;">
                              #{{ $position }}
                            </span>
                          </td>
                        @endif
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              {{-- Clear Instructions on Attendee vs General Pass --}}
              <div style="background:#fcfbf8;border:1px solid #e8e2d5;border-radius:10px;padding:16px;margin:0 0 24px;">
                <p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:#2c2c2c;">
                  <strong>Are you attending {{ $eventName }} in person?</strong>
                </p>
                <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#555555;">
                  <li><strong>Yes, I'm attending:</strong> Open your pass and select <em>"Yes, I'm going"</em> to unlock your exclusive <strong>Official Attendee VIP badge</strong>.</li>
                  <li><strong>Joining nationwide:</strong> Your <strong>General Launch Pass</strong> is ready to download and share on WhatsApp Status, Instagram, and X!</li>
                </ul>
              </div>

              {{-- Primary 1-Click CTA --}}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;width:100%;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#1f5c3a;border-radius:8px;">
                          <a href="{{ $launchPassUrl }}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">
                            Claim & Customize Your Launch Pass &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#777777;text-align:center;">
                Direct link: <a href="{{ $launchPassUrl }}" style="color:#1f5c3a;word-break:break-all;">{{ $launchPassUrl }}</a>
              </p>

              {{-- Referral Section --}}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-top:1px solid #e8e2d5;padding-top:20px;">
                <tr>
                  <td>
                    <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#3f3f3f;">
                      <strong>Move up before launch day:</strong> Every friend who joins with your referral link boosts your spot in the priority access queue:
                    </p>
                    <p style="margin:0 0 10px;">
                      <a href="{{ $referralUrl }}" style="font-size:13px;color:#1f5c3a;word-break:break-all;font-weight:600;">{{ $referralUrl }}</a>
                    </p>
                    @if (!empty($benefitsUrl))
                      <p style="margin:0;font-size:12px;color:#6b6b6b;">
                        🎁 <a href="{{ $benefitsUrl }}" style="color:#1f5c3a;font-weight:600;text-decoration:underline;">See referral rewards and perks &rarr;</a>
                      </p>
                    @endif
                  </td>
                </tr>
              </table>

              {{-- WhatsApp Channel --}}
              @if ($whatsappChannelUrl)
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-top:1px solid #e8e2d5;padding-top:20px;width:100%;">
                  <tr>
                    <td>
                      <p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:#3f3f3f;">
                        <strong>Join the Community:</strong> Follow our official WhatsApp Channel for behind-the-scenes launch updates.
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background:#25D366;border-radius:8px;">
                            <a href="{{ $whatsappChannelUrl }}" style="display:inline-block;padding:10px 18px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                              Join WhatsApp Channel
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              @endif

              <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#555555;">
                Warm regards,<br>
                <strong>The MyTijaara Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#fcfbf8;padding:16px 28px;border-top:1px solid #e8e2d5;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8c8270;">
                You received this email because you signed up for the MyTijaara waitlist.<br>
                <a href="{{ $unsubscribeUrl }}" style="color:#6b5a2e;text-decoration:underline;">Unsubscribe</a> from these notifications.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
