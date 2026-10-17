# Google Drive

**Status:** undecided. The maintainer is thinking about it.

## Today, with no changes

A backup file can already be saved to Google Drive and opened from it like any file (Drive for desktop, or upload and download). Nothing is sent to Google unless the user puts it there.

## Idea

"Save to Google Drive" and "Open from Google Drive" buttons in the workbook pages.

## What it would take

- A Google Cloud project with an OAuth client ID, set up for the site's exact https address (the example site needs https first; see [example-site.md](example-site.md)).
- Google's OAuth consent screen. Use the narrow `drive.file` scope, so the app sees only files it creates or the user picks. Google may still require app verification.
- The Google Identity Services and Picker scripts. That means loosening the content security policy to allow `accounts.google.com`, `apis.google.com`, and `www.googleapis.com`, and dropping the "the pages send nothing anywhere" promise for those pages.
- It cannot work from a downloaded copy opened with `file://`. Google sign-in needs a web address.
- Each Scout needs a Google account. School accounts may block third-party apps.

## Privacy

The data includes minors' names, birth dates, addresses, and phone numbers. Sending it to Google changes the project's privacy promise, and the README, index page, and in-page notes would need to say so plainly. Consider whether the troop or council has a policy on this.

**Effort:** several days, plus ongoing upkeep (OAuth client, consent screen, Google API changes).

## Decide

1. Is "save the backup file to Drive yourself" good enough?
2. If not: who owns the Google Cloud project and its upkeep, and is sending Scouts' data to Google acceptable?
