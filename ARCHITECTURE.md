# Attachment Download — architecture / context primer

> Paste this whole file as background/context before describing a task on this plugin.

## What it is

An **Obsidian desktop plugin** (TypeScript + rollup). Plugin id `obsidian-attachment-download`, display name **Attachment Download**. A heavily reduced fork of "Local Images Plus".

**Its one job:** when a note references **external** media — a web `https://…` URL, a `data:` base64 image, or a `file://` path — download the file into the vault and rewrite the link to point at the local copy. All attachment *organising / renaming / cleanup* is intentionally left to Obsidian and to the **obsidian-attachment-management** plugin; this plugin's folder/name settings deliberately mirror attachment-management's so the two interoperate (configure both identically → a download lands exactly where attachment-management would keep it).

## Repo / build / deploy / release

- **Repo:** `a3k7dotmd/obsidian-attachment-download` (GitHub; `gh` CLI authed as `a3k7dotmd`). **Local clone:** `/home/alexandre/cc/obsidian-attachment-download`.
- **Build:** `npm run build` (rollup) → emits `main.js` (+ copies `manifest.json`/`styles.css`) into `obsidian_local_images_plus_latest/`. ~1.6 MB bundle with inline sourcemap. There are **pre-existing, non-fatal** TS warnings (TS2339 for `getConfig`/`exists`/`activeEditor`/`ensureFolderExists`, TS2550 `matchAll`) — rollup bundles anyway; **ignore them**.
- **Deploy (test):** copy **`main.js` + `manifest.json` + `styles.css` only — NEVER `data.json`** to the vault plugin folder `/media/alexandre/HTPC2_E/git/.obsidian/plugins/obsidian-attachment-download/` (a CIFS-mounted Windows "HTPC2" vault). The install folder name MUST equal the plugin id. New settings keys get their defaults via `this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())`. **Bump the version on every test build** so the live build is identifiable (the title balloon shows `APP_TITLE`).
- **Version bump** touches four places: `manifest.json`, `package.json`, `versions.json`, and `APP_TITLE` in `src/config.ts`.
- **Commit/push:** explicit-path staging (`git add -- <files>`, never `git add .`/`-A`); push with `git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin main`. End commit messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Release:** `gh release create <ver> --repo a3k7dotmd/obsidian-attachment-download --title "…" --notes-file <f> main.js manifest.json styles.css <zip>` — **no `v` prefix** (`.npmrc` has `tag-version-prefix=""`); the zip contains a folder `obsidian-attachment-download/` with the 3 files.

## Source layout (`src/`)

- **main.ts** — plugin lifecycle (`onload`); command registration; event wiring; the processing queue; settings load/save + one-time migration. Events: `vault.on('create')` **and** `workspace.on('file-open')` both call **`maybeProcessNote`**; `workspace.on('editor-paste')` → `onPasteFunc`. **All handlers are wrapped in `this.registerEvent(...)`** so they don't leak duplicate handlers across plugin reloads.
- **contentProcessor.ts** — the download path. `imageTagProcessor` → **`processImageTag`** (download → write → rewrite one link). **`getRootPath`** + **`getMDir`** build the target **directory** (`{root}/{attachment path}`); **`chooseFileName`** builds the **filename** (from the `attachFormat` template); **`getRDir`** builds the **link path** written into the note (always follows Obsidian's `newLinkFormat`).
- **config.ts** — `ISettings` interface, `DEFAULT_SETTINGS`, `APP_TITLE`, and the regexes (`MD_SEARCH_PATTERN`, etc.).
- **settingstab.ts** — the settings GUI; sections are `containerEl.createEl("h3", { text: "…" })` blocks.
- **utils.ts** — helpers: `md5Sig` (partial hash, internal dedup), **`md5Full`** (full UPPERCASE MD5 = attachment-management's `${md5}`), `cFileName`, `getFileExt`, `pathJoin`, `normalizePath`, `downloadImage`, `trimAny`, `blobToJpegArrayBuffer`.
- **modal.ts** — `ModalW1` (confirm) / `ModalW2` (info). **uniqueQueue.ts** — `UniqueQueue` download queue.

## Processing flow

1. **Trigger:** a note is created or opened (`maybeProcessNote`), web/HTML is pasted (`onPasteFunc`), or a command runs (`processActivePage` / `processAllPages`).
2. **`maybeProcessNote` gate:** must be a real `.md`/`.canvas` file (**`ExemplaryOfMD`**, anchored to the extension), not in an excluded path (**`ThePathExcluded`**), not a note the plugin itself just rewrote (**`justModifiedByPlugin`** guard — the CIFS mount reports the plugin's own `vault.modify` as a fresh `create`), and must actually contain an external link. If so → push to `modifiedQueue` + `setupQueueInterval`.
3. **`processModifiedQueue`** (interval) → **`processPage`**: `replaceAsync(content, MD_SEARCH_PATTERN, imageTagProcessor(...))` downloads + rewrites each external link, then `vault.modify(note, …)` and records the path in `justModifiedByPlugin`.
4. **`processImageTag`** (per link): download → `getMDir` (dir) → `chooseFileName` (name) → `vault.createBinary` → `getRDir` (link path) → returns the rewritten markdown.

## Settings model (mirrors obsidian-attachment-management)

Target path is composed as `{root}/{attachment path}/{attachment format}.ext`:

- **`saveAttE`** (Root path): `obsFolder` (Obsidian's own attachment folder) · `inFolderBelow` (fixed `attachmentRoot`) · `nextToNote` (`notePath/attachmentRoot`).
- **`attachmentRoot`** (Root folder): fixed root for the latter two modes.
- **`attachmentPath`** (sub-folder template): vars `${notepath}` (note's parent dir) · `${notename}` (note basename) · `${parent}` (parent folder name). Default `${notepath}/${notename}`.
- **`attachFormat`** (filename template): vars `${originalname}` · `${date}` (moment, `DateFormat`) · `${notename}` · `${md5}` (full uppercase MD5). Default `${originalname}`.
- **Link path** always follows Obsidian's `newLinkFormat` — there is no plugin setting (the old `pathInTags` was removed).
- **`ignoredExt`** (Exclude extension pattern): a **regex** tested against the file extension. **`ExcludedFoldersList`** (semicolon-separated folders) + **`excludeSubpaths`** (recursion on/off).
- **`migrateMediaSettings()`** in `loadSettings`, version-stamped via `mediaSettingsVersion`: migrates legacy keys (`mediaRootDir`, `useMD5ForNewWebAtt`, `pathInTags`) into the new model and deletes dead keys. Bump the version + add a step when changing the settings schema.

## Removed vs the original (do NOT re-add unless asked)

Orphan removal; folder-follow (move/rename/trash an attachment folder when its note is renamed/deleted); pasted/dropped image **file** relocation (`onFCreateFunc` / `processMdFilesOnTimer` / `processAll`); the separate MD5/PNG-pasted toggles — all stripped as overlapping with Obsidian + attachment-management.

## Gotchas

- The vault is a **CIFS / network mount** (Windows HTPC2): the file watcher can report a `modify` as a `create` → hence the `justModifiedByPlugin` guard, and `registerEvent` everywhere (leaked handlers once caused multi-version notification storms; the fix needs a **full Obsidian restart** to clear pre-existing leaks).
- `ExemplaryOfMD` anchors the include pattern to the extension (`(?:" + includepattern + ")$"`) so files merely *containing* ".md" (e.g. `obsidian.md-<ts>.log` console logs) are not processed.
- Never overwrite the user's `data.json`; the plugin owns it.
- A settings-reference doc for end users lives in the vault at `Notes/PIM/Obsidian/Attachment Download.md`.
