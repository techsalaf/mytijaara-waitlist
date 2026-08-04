{{-- Waitlist welcome email. Table layout + inline styles: mail clients ignore
     most modern CSS, so nothing here relies on flex, grid, or custom props. --}}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>You're on the MyTijaara waitlist</title>
</head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d5;">
          <tr>
            <td style="background:#1f5c3a;padding:22px 28px;">
              <span style="color:#f4e4bc;font-size:20px;font-weight:700;letter-spacing:-0.2px;">MyTijaara</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">You're in, {{ $name }}.</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                Thanks for joining the MyTijaara waitlist. One app for food, shopping,
                deliveries and trusted services across Nigeria.
              </p>

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
              <p style="margin:0 0 24px;">
                <a href="{{ $referralUrl }}" style="font-size:14px;color:#1f5c3a;word-break:break-all;">{{ $referralUrl }}</a>
              </p>

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
