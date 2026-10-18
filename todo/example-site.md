# Example site: remaining server settings

**Status:** optional. The example site, <https://www.cih.com/troop6/eagle/>, now answers over https, and http redirects to it (checked October 2026). That fixed the two problems http caused: the fill page's PDF fingerprint check (`crypto.subtle`) and the iPhone share menu both need https.

## To do

1. Optional: the headers in [INSTALL.md](../INSTALL.md#optional-server-settings).

## Consider

Hosting at its own address (for example `eagle.cih.com`). On `www.cih.com/troop6/eagle/`, any other page on `www.cih.com` can read saved drafts. That's fine if the rest of the site is your own static pages.
