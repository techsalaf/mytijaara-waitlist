{{-- Weekly digest email. Same table layout + inline style discipline as
     mail/waitlist-welcome.blade.php: mail clients drop flex, grid and custom
     properties, so nothing here depends on them. Every number comes from
     App\Support\WeeklyDigest::metrics(). --}}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MyTijaara weekly digest</title>
</head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d5;">
          <tr>
            <td style="background:#1f5c3a;padding:22px 28px;">
              <span style="color:#f4e4bc;font-size:20px;font-weight:700;letter-spacing:-0.2px;">MyTijaara</span>
              <span style="color:#cfe3d6;font-size:13px;display:block;margin-top:4px;">Weekly digest · {{ $m['from'] }} to {{ $m['to'] }}</span>
            </td>
          </tr>

          <tr>
            <td style="padding:26px 28px 8px;">
              <h1 style="margin:0 0 6px;font-size:21px;line-height:1.3;">{{ number_format($m['signups']) }} new signups in the last {{ $m['days'] }} days</h1>
              <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#5f5f5f;">
                @if ($m['growth'] >= 0)
                  Up {{ $m['growth'] }}% on the previous {{ $m['days'] }} days ({{ number_format($m['previousSignups']) }} signups).
                @else
                  Down {{ abs($m['growth']) }}% on the previous {{ $m['days'] }} days ({{ number_format($m['previousSignups']) }} signups).
                @endif
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
                <tr>
                  <td width="33%" style="background:#f4f8f5;border-radius:10px;padding:14px;vertical-align:top;">
                    <span style="font-size:12px;color:#5f7a6a;display:block;">Total waitlist</span>
                    <span style="font-size:22px;font-weight:700;color:#1f5c3a;">{{ number_format($m['total']) }}</span>
                  </td>
                  <td width="8"></td>
                  <td width="33%" style="background:#f4f8f5;border-radius:10px;padding:14px;vertical-align:top;">
                    <span style="font-size:12px;color:#5f7a6a;display:block;">Verified this period</span>
                    <span style="font-size:22px;font-weight:700;color:#1f5c3a;">{{ number_format($m['verified']) }}</span>
                    <span style="font-size:12px;color:#8a8a8a;display:block;">{{ $m['verifiedRate'] }}% of signups</span>
                  </td>
                  <td width="8"></td>
                  <td width="33%" style="background:#faf3e2;border-radius:10px;padding:14px;vertical-align:top;">
                    <span style="font-size:12px;color:#6b5a2e;display:block;">From referrals</span>
                    <span style="font-size:22px;font-weight:700;color:#8a6d16;">{{ number_format($m['referredSignups']) }}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px 8px;">
              <h2 style="margin:0 0 10px;font-size:15px;">Top cities</h2>
              @if (count($m['topCities']) === 0)
                <p style="margin:0 0 18px;font-size:14px;color:#8a8a8a;">No signups with a city recorded in this window.</p>
              @else
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:14px;">
                  @foreach ($m['topCities'] as $row)
                    <tr>
                      <td style="padding:7px 0;border-bottom:1px solid #f0ece2;color:#3f3f3f;">{{ $row['city'] }}</td>
                      <td align="right" style="padding:7px 0;border-bottom:1px solid #f0ece2;font-weight:600;color:#1f5c3a;">{{ number_format($row['signups']) }}</td>
                    </tr>
                  @endforeach
                </table>
              @endif

              <h2 style="margin:0 0 10px;font-size:15px;">Top referrers</h2>
              @if (count($m['topReferrers']) === 0)
                <p style="margin:0 0 18px;font-size:14px;color:#8a8a8a;">Nobody referred a friend in this window.</p>
              @else
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;font-size:14px;">
                  @foreach ($m['topReferrers'] as $row)
                    <tr>
                      <td style="padding:7px 0;border-bottom:1px solid #f0ece2;color:#3f3f3f;">
                        {{ $row['name'] }}<br>
                        <span style="font-size:12px;color:#8a8a8a;">{{ $row['email'] }}</span>
                      </td>
                      <td align="right" style="padding:7px 0;border-bottom:1px solid #f0ece2;font-weight:600;color:#8a6d16;">{{ number_format($row['referrals']) }}</td>
                    </tr>
                  @endforeach
                </table>
              @endif
            </td>
          </tr>

          <tr>
            <td style="background:#faf8f3;padding:16px 28px;border-top:1px solid #e8e2d5;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a8a;">
                Generated from live waitlist data on {{ $m['to'] }}.
                {{-- `@{{unsubscribe}}` is escaped so it survives into the stored HTML as a
                     literal token; CampaignMail swaps it for the recipient's real URL
                     at send time. --}}
                <a href="@{{unsubscribe}}" style="color:#8a8a8a;text-decoration:underline;">Unsubscribe</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
