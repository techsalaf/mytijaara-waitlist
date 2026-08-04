{{-- Admin invitation email. Table layout + inline styles, same constraints as
     the waitlist welcome mail: no flex, no grid, no custom properties. --}}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>You have been invited to the MyTijaara admin panel</title>
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
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Welcome aboard, {{ $name }}.</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">
                You have been given access to the MyTijaara admin panel as
                <strong>{{ $role }}</strong>. Set your password to finish setting up
                your account.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
                <tr>
                  <td style="background:#1f5c3a;border-radius:8px;">
                    <a href="{{ $acceptUrl }}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Set my password</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#6b6b6b;">
                If the button does not work, paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;">
                <a href="{{ $acceptUrl }}" style="font-size:13px;color:#1f5c3a;word-break:break-all;">{{ $acceptUrl }}</a>
              </p>

              <p style="margin:0;font-size:14px;line-height:1.6;color:#6b6b6b;">
                The MyTijaara team
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f3;padding:16px 28px;border-top:1px solid #e8e2d5;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a8a;">
                This link expires for security. If you were not expecting this
                invitation you can ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
