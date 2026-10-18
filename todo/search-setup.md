# Get the site found in search results

**Status:** ready to do. The pages are ready (titles, descriptions, a "Common questions" section, a sitemap); the steps below are things only the site's owner can do.

## Why it matters

A Scout, parent, or unit leader searching for help with the Eagle project workbook should be able to find this. Google ignores the old `keywords` tag, so there is nothing to add to the pages. What is left is telling search engines the site exists and getting other sites to link to it.

## What is already done

- Every page has its own title, meta description, and link-preview tags. A test checks their lengths and uniqueness, and blocks wording that calls the site official or says Scouting America made, approved, or endorsed it (`tests/run-tests.cjs`).
- The home page answers the questions people type ("Common questions" in `index.html`).
- `tools/deploy.sh` writes and copies a `sitemap.xml` when it is given the public address of the folder (`--url`, or `DEPLOY_URL` in `.deploy.conf`).
- `INSTALL.md` ("Being found in search results") explains the reasoning.

## To do

1. **Deploy with the address**, so the sitemap is written: `tools/deploy.sh --url https://www.cih.com/troop6/eagle/ --go` (with your `--target`, or `DEPLOY_TARGET` in `.deploy.conf`). Check that `https://www.cih.com/troop6/eagle/sitemap.xml` opens.
2. **Add the site to Google Search Console.** Choose a "URL prefix" property for `https://www.cih.com/troop6/eagle/`, verify it (an HTML file or a meta tag; verification files are not copied by the deploy script, so add the file to the server by hand or use the DNS method), then submit the sitemap. Bing Webmaster Tools does the same for Bing.
3. **If `www.cih.com` has a `robots.txt` at its top level**, add the line `Sitemap: https://www.cih.com/troop6/eagle/sitemap.xml`. It only works at the top of the whole site.
4. **Get links to it.** These matter more than anything on the page. Ask your troop, district, or council website to link to it, and post it where Scouts and parents look (a Scouting forum, a Facebook group, a unit newsletter). Use plain words as the link text, for example "Eagle project workbook helper".
5. **Set the GitHub repository's description, website, and topics** (repository settings, not code). Suggested description: *Free helper for the Eagle Scout Service Project Workbook: write your proposal, plan, fundraising application, and report, then fill the official PDF. Independent; not made or endorsed by Scouting America.* Website: the example site. Topics: `eagle-scout`, `eagle-project`, `scouting`, `scouts-bsa`, `workbook`, `pdf-form`, `offline`, `static-site`.
6. **Check back in 2 to 4 weeks.** In Search Console, "Pages" shows whether each page is indexed, and "Performance" shows the searches that found it. If real searches don't match the page text, adjust the "Common questions" wording and the descriptions to match what people actually type.

## Expect

New pages can take days to weeks to appear. The broad search "Eagle project workbook" is dominated by scouting.org and council sites, so don't expect page one for it. More specific searches ("fill out Eagle project workbook PDF", "Eagle project proposal help", "Eagle project fundraising application") are where a small site can show up.

## Keep honest

Don't add wording that suggests the site is official or made, approved, or endorsed by Scouting America, and don't claim more than the code does. Use the real words of the workbook ("Eagle Scout Service Project Workbook") descriptively.
