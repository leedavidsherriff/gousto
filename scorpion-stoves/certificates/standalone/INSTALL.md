# Putting the Sweep Certificate Book on scorpionstoves.com

One file, `index.html`, 64 KB. No database, no plugin, no build step, nothing to keep updated.
Upload it to the IONOS webspace and it works.

## Upload it

1. Sign in to IONOS → **Hosting** → **Web Space / File Manager** (or connect over SFTP with the
   credentials on that same page).
2. Open the folder the website is served from — usually `/` or `/htdocs`, the one that already
   contains the site's `index.html` or `index.php`.
3. Make a new folder inside it. **Don't call it `certificates`.** Something nobody would guess,
   e.g. `sweep-book-7k2`, because the page will be reachable by anyone who types the address.
4. Upload `index.html` into that folder.
5. On his phone, open `scorpionstoves.com/sweep-book-7k2/` and add it to the Home screen
   (Safari → Share → Add to Home Screen). It then opens like an app, full screen.

The site itself is untouched — this is a separate folder alongside it.

## First run, once

**Setup** tab → his details, then sign in the signature box and tap Save. Those print on every
certificate. Optionally add a logo.

The file ships with the business details **blank on purpose**. It sits on a public URL, so if the
details were baked in, anyone who found the address could generate a certificate carrying his
name. Blank means a stranger finds an empty shell.

## Where the data lives

In his phone's browser, and nowhere else. Not on the website, not on a server, not visible to
anyone who opens the URL.

That has one consequence worth being straight about: **clear the browser data and the book is
gone.** So Setup has a **Back up the book** button that saves a `.json` file — tell him to do it
every month or so and keep it in his email. **Restore from backup** puts everything back, which
is also how the book moves to a new phone.

If that ever feels too fragile, the fix is a proper hosted database. Everything else in the tool
stays as it is; only the storage layer changes.

## Two things to know

- **HTTPS is required** for the share sheet. IONOS gives free SSL — if the site is already
  `https://`, it's fine.
- **jsPDF loads from a CDN** (`cdnjs.cloudflare.com`), so the first load each day needs signal.
  After that the browser caches it. To make it work with no signal at all, download
  `jspdf.umd.min.js`, put it in the same folder, and change the `<script src="...">` at the top
  of `index.html` to `<script src="jspdf.umd.min.js">`.

## If the site is IONOS MyWebsite

The drag-and-drop builder doesn't always allow arbitrary file uploads. Two ways round it:

- Use the builder's **HTML element** on a hidden page and paste in the whole file contents, or
- Upload to the webspace over SFTP anyway — most MyWebsite plans still include one.

## Keeping it updated

Edit `index.html` and re-upload. `CHECKS` near the top of the script is the single source of
truth for the 1–11 inspection items: change it and both the on-screen form and the PDF follow.

## The other copy

There is a second version of this tool at `../index.html`, published as a Claude artifact. It is
the same app with cloud storage instead of phone storage, but it needs a Claude account in the
owner's organisation to open. This standalone copy is the one for Gareth.
