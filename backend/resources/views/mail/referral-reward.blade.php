{{-- Referral reward notice. Table layout + inline styles, same constraints as
     the other transactional mails: no flex, no grid, no custom properties. --}}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your MyTijaara referral reward</title>
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
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Thank you, {{ $name }}.</h1>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                {{ $referrals }} of your referral{{ $referrals === 1 ? '' : 's' }}
                {{ $referrals === 1 ? 'has' : 'have' }} been confirmed, so your
                referral reward has been approved.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#faf8f3;border:1px solid #e8e2d5;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;text-align:center;">
                    <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#8a8a8a;">Reward</div>
                    <div style="margin-top:6px;font-size:28px;font-weight:700;color:#1f5c3a;">{{ $amount }}</div>
                    <div style="margin-top:4px;font-size:13px;color:#6b6b6b;">
                      for {{ $referrals }} confirmed referral{{ $referrals === 1 ? '' : 's' }}
                    </div>
                  </td>
                </tr>
              </table>

              @if ($note)
                <p style="margin:0 0 18px;padding:12px 14px;background:#f6f4ef;border-left:3px solid #c9a24c;font-size:14px;line-height:1.6;color:#3f3f3f;">
                  {{ $note }}
                </p>
              @endif

              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                Keep sharing your link and keep earning.
              </p>
              <p style="margin:0 0 24px;">
                <a href="{{ $referralUrl }}" style="font-size:14px;color:#1f5c3a;word-break:break-all;">{{ $referralUrl }}</a>
              </p>

              <p style="margin:0;font-size:14px;line-height:1.6;color:#6b6b6b;">
                The MyTijaara team
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f3;padding:16px 28px;border-top:1px solid #e8e2d5;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a8a;">
                You are receiving this because you referred someone to MyTijaara.
                <a href="{{ $unsubscribeUrl }}" style="color:#8a8a8a;">Unsubscribe</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
