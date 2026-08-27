# Visitor guide

Written for the person holding an access code. An administrator can send this, or
lift from it.

## Getting in

Go to **`/dataroom`**.

You need two things, both sent to you by your MyTijaara contact:

1. The email address the access was issued to.
2. Your access code, in the form `MTJ-8F4K-92QX`.

Some rounds also require a shared room PIN. If one is set, the field appears on the
same screen. If it does not appear, there is none.

The code is not case-sensitive and the dashes are forgiving. Pasting
`mtj–8f4k 92qx` out of a mail client works: it is uppercased and the separators are
normalized before checking.

You must use the exact email address the access was issued to. A different address,
even your own, will not work.

## If it does not work

The screen says:

> We could not verify those details. Please check the email address and access code
> you were sent.

That single sentence covers every cause on purpose, so nobody probing the page can
learn which email addresses exist. If you are sure both are right, the likely cause
is that the access has expired, been revoked, or has not started yet. Contact your
MyTijaara contact.

After five failed attempts you are paused for fifteen minutes:

> Too many attempts. For security, access has been paused temporarily. Please try
> again later.

Wait it out. Retrying does not help and the counter is per email address as well as
per network.

## Confidentiality acknowledgement

On first entry you are asked to acknowledge that the material is confidential. The
timestamp is recorded. It is a reminder of the obvious, not a legal agreement, and
it has not been reviewed by counsel. Any binding NDA is a separate document your
MyTijaara contact will handle.

## Your session

Two clocks run:

- **Idle timeout, 30 minutes.** Any click resets it.
- **Absolute lifetime, 8 hours.** Activity does not extend this one.

Whichever arrives first ends the session and you re-authenticate with the same email
and code. That is normal and not a sign anything is wrong.

Log out when you are finished, especially on a shared machine.

## Your access window

The header shows when your access expires. Inside the last 24 hours it turns into a
warning. When it lapses, access stops at that instant, including mid-session. Ask
for an extension before it does rather than after; an extension is one action for
your contact, a new grant is several.

If your access shows a start date in the future, it will not work until then.

## What you will see

**Dashboard.** Category count, total documents in the room, how many you can open,
how many need further authorization, and a Start Here reading list of up to five
documents in the order the founders suggest.

**Categories.** The pre-seed room ships with five:

```
01 Corporate Governance
02 Financials & Models
03 Pitch Deck & Strategy
04 Product & Technology
05 Commercial & Traction
```

You will see every category name, even ones you cannot open. That is intentional:
you can see the shape of the room and ask for what you need by name.

**Documents.** Title, file type and confidentiality label. For documents inside your
access you also get the description, file size and version.

**Locked documents** appear with a lock and:

> Additional authorization required.

The title and type are visible; the description, size and version are not, because a
description can itself be confidential. A lock is not a hint that you were meant to
have it. Ask if you need it.

**Search.** Matches title, description and tags across the documents you can
access. It searches nothing outside your access, so a term that only matches a
document you cannot see returns no results rather than a locked card.

**Your activity.** Your own trail: what you opened, previewed and downloaded, and
when. Only yours. You cannot see other visitors or administrator actions.

## Viewing documents

PDFs, PNGs and JPEGs open in the browser. Everything else, including Word, Excel and
PowerPoint files, shows:

> Preview unavailable for this file type.

and offers a download if your access allows it. There is no in-browser Office
viewer, and no document is ever sent to a third-party viewer service, which is the
reason for the gap rather than an oversight.

PDFs may carry a watermark with your email address, your organization and the date.
It is there so a copy can be traced back to the session that produced it.

## Downloading

If a download button is not there, or a download is refused with:

> Downloading is not permitted for this document.

it is a policy on your access or on that specific document, not a fault. Downloads
can be disabled room-wide, per visitor, per document, or per document inside a
category you can otherwise open. Any one of those is enough to withhold it.

Some documents are view-only and are meant to be read in the browser.

## Printing

Where printing is withheld, the print option is not offered. A browser cannot
actually be stopped from printing what it has rendered, and this is not presented as
if it could be. What the setting does is signal the expectation and record it.

## What is expected of you

- Do not forward your code. It is issued to one email address and every use is
  logged against it. If someone else needs access, ask for their own grant.
- Do not redistribute documents. Every view and download is recorded with your
  email, the time and your IP address.
- Tell your contact immediately if you think your code has been seen by anyone
  else. It can be regenerated in seconds, which invalidates the old one.

## What is recorded

Every authentication, view, preview, download, denied request and session start and
end, with your email, the grant, the document, the timestamp, your IP address and
your browser's user agent. This is a diligence room for a live funding round, so the
record is the point.

No document contents and no credential are ever written to that log.

## If the room is closed

> The data room is not currently available. Please contact your MyTijaara contact
> for assistance.

This is routine. It appears during maintenance and during any period the founders
close the room deliberately. Your code is unaffected.

## Getting help

Your MyTijaara contact, the person who sent the code. There is no self-service
password reset, no registration and no account, because there is no account: the
grant issued to your email address is the whole identity. That is also why nothing
you do can extend or widen your own access.
