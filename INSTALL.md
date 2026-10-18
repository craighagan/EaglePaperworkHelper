# Putting EaglePaperworkHelper on a website

It is just copying files. There is no build step, no server code, no database, and no configuration. Everything runs in the visitor’s browser, and the server never receives anyone’s answers.

## 1. Choose where it lives

- **Use https.** The PDF checks rely on browser features that only work over https. GitHub Pages and most hosts provide it.
- **Give it its own web address**, such as `eagle.example.org` or a GitHub Pages site for an account or organization used only for this. Browsers let every page at the same address read the drafts saved there.
  - Don’t put it under a `username.github.io` that hosts other projects.
  - Don’t put it on a site that runs ads, analytics, or other people’s scripts.
  - A folder on your troop’s site (for example `troop42.org/eagle/`) works, but any page on that site could read saved drafts. Prefer a subdomain.

## 2. Copy these files

Copy them with the same folder structure:

```text
index.html
EagleWorkbook-guided.html
EagleWorkbook.html
FillOfficialPDF.html
BackupFromPDF.html
lib/
vendor/
docs/          (pictures used by index.html and the README)
README.md
LICENSE
.nojekyll      (GitHub Pages only; harmless elsewhere)
.htaccess      (Apache only: makes browsers check for new versions; see Caching below)
```

Leave these out. They are for developers only:

```text
tests/  tools/  todo/  AGENTS.md  INSTALL.md  .gitignore  .git/
```

Never upload backup files (`.json`) or filled PDFs. They contain Scouts’ personal information.

Example, copying from the downloaded folder to a server you reach over SSH:

```bash
rsync -av --delete \
  index.html EagleWorkbook-guided.html EagleWorkbook.html FillOfficialPDF.html BackupFromPDF.html \
  lib vendor docs README.md LICENSE .nojekyll .htaccess \
  you@your-server:/var/www/eagle/
```

The `--delete` option removes files on the server that are no longer in the project. Check the target folder before you run it.

If you keep a clone of this repository, `tools/deploy.sh` does the same copy without `--delete`, after checking that everything is committed and the tests pass. Run `tools/deploy.sh --help` for usage. It shows a dry run first, and copies for real only with `--go`:

```bash
tools/deploy.sh --target you@your-server:/var/www/eagle/              # dry run
tools/deploy.sh --target you@your-server:/var/www/eagle/ --url https://example.org/eagle/ --go
```

You can keep the target in a file named `.deploy.conf` (a line `DEPLOY_TARGET=you@your-server:/var/www/eagle/`), which is ignored by git. Serve the site over `https://`: the iPhone share menu only works on secure pages.

### GitHub Pages

1. Push this repository to GitHub. It must be public for free Pages; [GitHub’s Pages docs](https://docs.github.com/pages) cover the other options.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, then **main** and **/ (root)**, and click **Save**.
4. After a minute, the site is at `https://<account>.github.io/EaglePaperworkHelper/`.

The developer files (`tests/`, `tools/`, `todo/`, `AGENTS.md`) are published too, which is harmless: they contain only code, notes, and fictional sample data.

## 3. Check it

Open the site’s address in a browser, then:

1. The home page shows its picture and four links.
2. **Guided workbook:** type a name, wait a moment, and reload. The name is still there.
3. **Fill the official PDF:** click **Get the official PDF for me**. It should say it is using the official PDF from scouting.org. (The visitor’s browser downloads that PDF directly from scouting.org; your server is not involved.)
4. **Make a backup file from a PDF:** the page opens without a “missing its helper files” message.

If a page says it is missing its helper files, the `lib` or `vendor` folder is missing or in the wrong place.

## Caching: make browsers pick up new versions

Without a caching header, a browser decides for itself how long to keep each page and script, and each file can be guessed differently. After an update, a Scout can then run an old page with newer library files, and things look broken or missing (for example, saved pages that seem to be gone) until a forced reload. Tell browsers to check every time. When nothing changed, the server answers “not modified” and sends nothing, so this costs almost nothing.

- **Apache:** the `.htaccess` file in this repository does it (it needs `mod_headers`, and `AllowOverride FileInfo` for the folder). Or put the same lines in the site’s configuration:

  ```apache
  <FilesMatch "\.(html|js|md|css|txt)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  ```

- **nginx:**

  ```nginx
  location ~* \.(html|js|md|css|txt)$ { add_header Cache-Control "no-cache"; }
  ```

- **GitHub Pages and some other hosts** don’t let you set headers. Browsers keep files for a few minutes there, which is usually fine.

`tools/deploy.sh` copies `.htaccess` and, after a real copy, checks that the home page comes back with `Cache-Control: no-cache`.

## Optional server settings

None are required. If your host lets you set response headers, these add protection:

```text
Content-Security-Policy: frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```

Each page already sets its own content security policy (allowed scripts and network requests) in its HTML. `frame-ancestors`, which stops other sites from embedding the pages, only works as a header.

## Try it on your own computer first (optional)

You don’t need a server for this. Double-clicking `index.html` works. To test the website version, run this in the project folder, then open <http://127.0.0.1:8080/>:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

This serves the pages only to your own computer. Press Ctrl+C to stop it.

## Updating

Copy the new files over the old ones, the same way. Visitors keep their saved drafts, because those live in their own browsers, not on the server.
