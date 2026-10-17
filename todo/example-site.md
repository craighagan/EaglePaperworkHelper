# https for the example site

**Status:** ready to do (server setup, not code).

The example site is <http://www.cih.com/troop6/eagle/>.

## Why it matters

- Browsers only allow the PDF fingerprint check (`crypto.subtle`) on https. Over http, the fill page warns: "This browser could not check that the PDF is the exact file published by Scouting America." Filling still works.
- Visitors' answers stay in their browsers either way, but https stops anyone on the network from changing the pages in transit.

## To do

1. Turn on https for the site (for example with Let's Encrypt / certbot).
2. Redirect http to https.
3. Update the two README links to `https://`.
4. Optional: the headers in [INSTALL.md](../INSTALL.md#optional-server-settings).

## Consider

Hosting at its own address (for example `eagle.example.org`). On a shared site, any other page on the same site can read saved drafts. That's fine if the rest of the site is your own static pages.
