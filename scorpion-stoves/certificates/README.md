# Sweep Certificate Book

A self-contained chimney sweeping certificate tool for Gareth (Clean Sweep Chimney Services /
Scorpion Stoves), built to replace the £9.99-per-certificate app.

**Live page:** https://claude.ai/code/artifact/e54f47e4-e49e-4568-8572-433debc755e6

## What it does

1. **Issue** — fill in the customer and the 1–11 inspection checklist on site. Every answer
   defaults to the most common one, so a routine sweep is a few taps.
2. **PDF** — generates an A4 certificate in the browser and hands it to the phone's share sheet,
   so it goes straight to the customer over WhatsApp or email.
3. **Book** — every certificate issued, searchable by name, address, postcode or number.
4. **Due** — anything expiring within 90 days, with a one-tap reminder message to copy and send.
   This is the part the paid app doesn't give back: the rebooking list is the business.
5. **Setup** — his details, membership body and ID, drawn signature, optional logo, and the
   certificate numbering sequence.

## How it's put together

Single HTML file, no build step. The whole thing is `index.html`.

- `jsPDF` (pinned, from cdnjs) draws the certificate as vector text — small, crisp files.
- The `downloads` runtime capability offers the finished PDF to the viewer.
- The `db` runtime capability stores settings and issued certificates:
  - `settings/business` — name, company, contact details, membership, number prefix
  - `settings/brand` — signature and logo, as PNG data URLs
  - `settings/counters` — `{year, n}` for sequential certificate numbers
  - `certificates/<ref>` — one document per certificate, including a snapshot of the
    business details as they read on the day it was issued

`CHECKS` in `index.html` is the single source of truth for the inspection items: it drives both
the on-screen form and the PDF layout. Add or change an item there and both follow.

If either capability is unavailable in a given view, the page still loads and the form still
works — only saving or PDF hand-off drops out.

## Before he uses it in anger

- Check the business details in **Setup** — they were seeded from the certificate in the
  screenshot and the website address was truncated there, so confirm it.
- **Member of / Member ID** are deliberately blank. They print only if filled in, and should
  carry his real trade body and number.
- No third-party marks (fuel-safety or carbon-monoxide campaign badges) are reproduced, and
  nothing claims an accreditation he hasn't entered himself.
