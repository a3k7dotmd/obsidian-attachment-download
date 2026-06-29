# Attachment Download

An [Obsidian](https://obsidian.md) plugin that **automates downloading external attachments** referenced in your notes into the vault and rewrites the links to point at the local copies. That is *all* it does — organizing, renaming and cleaning up attachments is intentionally left to Obsidian itself and to [obsidian-attachment-management](https://github.com/trganda/obsidian-attachment-management).

It is a heavily reduced and rebranded fork of [Local Images Plus](https://github.com/Sergei-Korneev/obsidian-local-images-plus). Its attachment **folder and file-naming** behaviour is mirrored from [obsidian-attachment-management](https://github.com/trganda/obsidian-attachment-management), to make setup straightforward and to hand the downloaded files off to the attachment-management plugin cleanly.

## What it does

When a note contains an **external** media reference — a web `https://…` URL, a `data:` base64 image, or a `file://` path — the plugin downloads the file into your vault and replaces the link with one pointing at the saved local copy.

It runs:

- **automatically** when you open or create a note that contains such a link (e.g. a freshly-clipped note) — processing only that one note, never the whole vault;
- on **paste** of web/HTML content that contains media links;
- on demand via the **Download attachments for the current note** / **…for all your notes** commands.

The download folder and file name are fully templated and **mirror attachment-management's settings layout**, so when you configure both plugins identically a download lands exactly where attachment-management would keep it — leaving it nothing to re-organize.

## What it deliberately does *not* do

The whole point of this fork is to do attachment **download** well and leave the rest to attachment-management, so the two don't fight. Everything in Local Images Plus that overlapped with Obsidian's own behaviour or with attachment-management has been removed:

- **No management of existing attachments** — no "remove orphaned attachments", and no moving / renaming / trashing of an attachment folder when its note is renamed or deleted.
- **No handling of pasted or dropped image *files*** — when you paste or drop an image, Obsidian (and attachment-management) decide where it goes; this plugin does not relocate it. It acts only on *external links that need downloading*.
- The settings and toggles that drove those behaviours are gone.

## Settings

The **Media folder settings** mirror attachment-management's `{root path}/{attachment path}/{attachment name}` model:

| Setting | Notes |
|---|---|
| **Root path to save attachment** | *Copy Obsidian settings* · *In the folder specified below* · *Next to note in folder specified below* |
| **Root folder** | fixed root for the two "specified below" options |
| **Attachment path** | sub-folder template — variables `${notepath}`, `${notename}`, `${parent}` (default `${notepath}/${notename}`) |
| **Attachment format** | file-name template — variables `${originalname}`, `${date}`, `${notename}`, `${md5}` (full uppercase MD5, identical to attachment-management's) — default `${originalname}` |
| **Date format** | Moment format for `${date}` |

Set these to the same values as attachment-management and downloads land where it keeps them.

Other settings of note:

- **Link format** always follows Obsidian's *Settings → Files & Links → New link format* (Shortest / Relative / Absolute) — there is no plugin override.
- **Exclude extension pattern** — a regex of file extensions never to download, matching attachment-management's `excludeExtensionPattern` (e.g. `pdf|docx?|zip`).
- **Excluded paths** / **Exclude subpaths** — semicolon-separated folder paths to skip (copy-paste compatible with attachment-management), with optional recursion into subfolders.
- Plus: compress downloaded PNGs (to JPEG/WebP), download retries, a file-size floor, and an *Automatically process opened notes* toggle.

## Commands

- **Download attachments for the current note** — download this note's external media into the configured location.
- **Download attachments for all your notes** — the same across the whole vault (with a confirmation prompt).
- A few unrelated editor helpers (set note name from its first heading, URL-encode the selection, convert selected HTML to Markdown), all hideable via *Disable additional commands*.

## Install (manual)

This is a personal plugin, installed by hand:

1. Build it (`npm install && npm run build`) or take `main.js`, `manifest.json` and `styles.css` from a release.
2. Copy those three files into `<vault>/.obsidian/plugins/obsidian-attachment-download/` — the folder name **must** match the plugin id `obsidian-attachment-download`.
3. Enable **Attachment Download** under *Settings → Community plugins*, then fully restart Obsidian.

## Build from source

```
npm install
npm run build      # production bundle -> obsidian_local_images_plus_latest/
npm run dev        # rollup watch
```

## Credits & license

A fork of [Local Images Plus](https://github.com/Sergei-Korneev/obsidian-local-images-plus) by Sergei Korneev, itself derived from [aleksey-rezvov](https://github.com/aleksey-rezvov/obsidian-local-images) and [niekcandaele](https://github.com/niekcandaele/obsidian-local-images). The attachment path/name resolver is adapted from [obsidian-attachment-management](https://github.com/trganda/obsidian-attachment-management) by trganda (MIT). Released under the [MIT license](LICENSE).
