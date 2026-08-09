<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ $subject }}</title>
</head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d5;">
          <tr>
            <td style="background:#1f5c3a;padding:22px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  @if ($logoUrl)
                    <td><img src="{{ $logoUrl }}" alt="{{ $siteName }}" style="height:34px;width:auto;display:block;"></td>
                  @else
                    <td style="background:#d4a017;border-radius:8px;padding:6px 12px;font-weight:bold;color:#1f5c3a;font-size:16px;">M</td>
                    <td style="padding-left:10px;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:-0.5px;">{{ $siteName }}</td>
                  @endif
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;line-height:1.6;font-size:15px;color:#3f3f3f;">
              {!! $body !!}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;background:#faf8f5;border-top:1px solid #e8e2d5;font-size:12px;color:#7a7a7a;text-align:center;">
              <p style="margin:0 0 8px;">Sent by <strong>{{ $siteName }}</strong></p>
              <p style="margin:0;">
                <a href="{{ $unsubscribeUrl }}" style="color:#1f5c3a;text-decoration:underline;">Unsubscribe from email updates</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
