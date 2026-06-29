import { URL } from "url";
import path from "path";
import {
  App,
  DataAdapter,
  TFile,
  Plugin
} from "obsidian";


import {
  isUrl,
  downloadImage,
  readFromDisk,
  cFileName,
  logError,
  trimAny,
  pathJoin,
  normalizePath,
  base64ToBuff,
  md5Sig,
  md5Full,
  getFileExt,
  blobToJpegArrayBuffer
} from "./utils";

import {
  ISettings,
  SUPPORTED_OS
} from "./config";


import AsyncLock from "async-lock";
import moment from "moment";

export function imageTagProcessor(app: Plugin,
  noteFile: TFile,
  settings: ISettings,
  defaultdir: boolean
) {

  const unique = Math.random().toString(16).slice(2,);

  async function processImageTag(match: string,
    anchor: string,
    link: string,
    caption: string,
    imgsize: string) {


    logError("processImageTag: " + match)
    if (!isUrl(link)) {
      return match;
    }

    try {

      var lock = new AsyncLock();
      let fpath;
      let fileData: ArrayBuffer;
      const opsys = process.platform;
      const mediaDir = await getMDir(app.app, noteFile, settings, defaultdir, unique);
      await app.ensureFolderExists(mediaDir);
      const protocol = link.slice(0, 5);

      if (protocol == "data:") {
        logError("ReadBase64: \r\n" + fpath, false);
        fileData = await base64ToBuff(link);
      }
      else

        if (protocol == "file:") {
          logError("Readlocal: \r\n" + fpath, false);
          if (SUPPORTED_OS.win.includes(opsys)) { fpath = link.replace("file:///", ""); }
          else if (SUPPORTED_OS.unix.includes(opsys)) { fpath = link.replace("file://", ""); }
          else { fpath = link.replace("file://", ""); }

          fileData = await readFromDisk(fpath);
          if (fileData === null) {
            fileData = await readFromDisk(decodeURI(fpath));
          }
        }
        else {
          //Try to download several times
          let trycount = 0;
          while (trycount < settings.tryCount) {
            fileData = await downloadImage(link);
            logError("\r\n\nDownloading (try): " + trycount + "\r\n\n");
            if (fileData !== null) { break; }
            trycount++;
          }
        }
      if (fileData === null) {
        logError("Cannot get an attachment content!", false);
        return null;
      }


      if (Math.round(fileData.byteLength / 1024) < settings.filesizeLimit) {
        logError("Lower limit of the file size!", false);
        return null;
      }

      try {


        const { fileName, needWrite } = await lock.acquire(match, async function () {


          const parsedUrl = new URL(link);

          let fileExt = await getFileExt(fileData, parsedUrl.pathname);


          if (fileExt == "png" && settings.PngToJpeg) {


            let compType = (settings.ImgCompressionType == "") ? "image/jpeg" : settings.ImgCompressionType;
            const blob = new Blob([new Uint8Array(fileData)]);
            fileData = await blobToJpegArrayBuffer(blob, settings.JpegQuality * 0.01, compType)
            logError("arbuf: ")
            logError(fileData)
          }
          const { fileName, needWrite } = await chooseFileName(
            app.app.vault.adapter,
            mediaDir,
            link,
            fileData,
            settings,
            noteFile
          );
          return { fileName, needWrite };
        });



        if (needWrite && fileName) {
          await app.app.vault.createBinary(fileName, fileData);
        }

        if (fileName) {

          let shortName = "";
          const rdir = await getRDir(app.app, noteFile, settings, fileName, link);
          let pathWiki = rdir[0];
          let pathMd = rdir[1];


          if (settings.addNameOfFile && protocol == "file:") {

            if (!app.app.vault.getConfig("useMarkdownLinks")) {

              shortName = "\r\n[[" +
                fileName +
                "\|" +
                rdir[2]["lnkurid"] + "]]\r\n";
            }
            else {
              shortName = "\r\n[" +
                rdir[2]["lnkurid"] +
                "](" +
                rdir[2]["pathuri"] +
                ")\r\n";
            }
          }

          if (!app.app.vault.getConfig("useMarkdownLinks")) {

            // image caption
            (!settings.useCaptions || !caption.length) ? caption = "" : caption = "\|" + caption;

            // image size has higher priority
            (!settings.useCaptions || !imgsize.length) ? caption = "" : caption = "\|" + imgsize;

            return [match, `![[${pathWiki}${caption}]]`, `${shortName}`];
          }

          else {
            (!settings.useCaptions || !caption.length) ? caption = "" : caption = " " + caption;
            return [match, `![${anchor}](${pathMd}${caption})`, `${shortName}`];
          }



        } else {
          return null;
        }

      } catch (error) {
        if (error.message === "File already exists.") {
        } else {
          throw error;
        }
      }

      return null;
    } catch (error) {
      logError("Image processing failed: " + error, false);
      return null;
    }
  }

  return processImageTag;
}





export async function getRDir(app: App,
  noteFile: TFile,
  settings: ISettings,
  fileName: string,
  link: string = undefined):
  Promise<Array<any>> {
  let pathWiki = "";
  let pathMd = "";

  const notePath = normalizePath(noteFile.parent.path);
  const parsedPath = path.parse(normalizePath(fileName));

  const parsedPathE = {
    parentd: path.basename(parsedPath["dir"]),
    basen: (parsedPath["name"] + parsedPath["ext"]),
    lnkurid: path.basename(decodeURI(link)),
    pathuri: encodeURI(normalizePath(fileName))
  };



  // Link path always follows Obsidian's "New link format" (newLinkFormat); no plugin override:
  // absolute -> full path, relative -> relative to note, shortest -> filename only.
  let mode = "baseFileName";
  switch (app.vault.getConfig("newLinkFormat")) {
    case "absolute":
      mode = "fullDirPath";
      break;
    case "relative":
      mode = "onlyRelative";
      break;
    case "shortest":
    default:
      mode = "baseFileName";
      break;
  }

  switch (mode) {
    case "baseFileName":
      pathWiki = pathMd = parsedPathE["basen"];
      break;
    case "onlyRelative":
      pathWiki = pathJoin([path.relative(path.sep + notePath, path.sep + parsedPath["dir"]), parsedPathE["basen"]]);
      pathMd = encodeURI(pathWiki);
      break;
    case "fullDirPath":
      pathWiki = fileName.replace(/\\/g, "/");
      pathMd = parsedPathE["pathuri"];
      break;
  };
  return [pathWiki, pathMd, parsedPathE];

}


// Root-path resolution adapted from trganda/obsidian-attachment-management (MIT),
// src/commons.ts getRootPath — so a download's root matches attachment-management's
// when both plugins are configured alike.
function getRootPath(app: App, notePath: string, settings: ISettings): string {
  const obsmediadir = app.vault.getConfig("attachmentFolderPath");
  switch (settings.saveAttE) {
    case 'inFolderBelow':
      return settings.attachmentRoot;
    case 'nextToNote':
      return pathJoin([notePath, settings.attachmentRoot.replace("./", "")]);
    default: // obsFolder: defer to Obsidian's own attachmentFolderPath
      if (obsmediadir === '/') return obsmediadir;
      if (obsmediadir === './') return pathJoin([notePath]);
      if (obsmediadir.match(/\.\/.+/g) !== null) return pathJoin([notePath, obsmediadir.replace('\.\/', '')]);
      return normalizePath(obsmediadir);
  }
}

export async function getMDir(app: App,
  noteFile: TFile,
  settings: ISettings,
  defaultdir: boolean = false,
  unique: string = ""): Promise<string> {

  // notepath = the note's parent dir relative to vault root, "" for a root-level note
  // (Obsidian reports "/" for the root folder; attachment-management uses "").
  const notePath = (noteFile.parent && noteFile.parent.path !== "/") ? noteFile.parent.path : "";
  const parentName = path.basename(notePath);
  const current_date = moment().format(settings.DateFormat);

  // (Currently unreachable — the "Obsidian folder" command was removed.) Flat localize into
  // Obsidian's own attachment folder with no per-note template.
  if (defaultdir) {
    return trimAny(getRootPath(app, notePath, { ...settings, saveAttE: "obsFolder" }), ["/", "\\"]);
  }

  // {root}/{attachment path}, mirroring attachment-management's getAttachmentPath.
  const root = getRootPath(app, notePath, settings);
  const sub = settings.attachmentPath
    .replace("${notepath}", notePath)
    .replace("${notename}", noteFile.basename)
    .replace("${parent}", parentName)
    .replace("${date}", current_date)
    .replace("${unique}", unique);

  return trimAny(pathJoin([root, sub]), ["/", "\\"]);
}










async function chooseFileName(
  adapter: DataAdapter,
  dir: string,
  link: string,
  contentData: ArrayBuffer,
  settings: ISettings,
  noteFile: TFile
): Promise<{ fileName: string; needWrite: boolean }> {
  const parsedUrl = new URL(link);
  let fileExt = await getFileExt(contentData, parsedUrl.pathname);
  logError("file: " + link + " content: " + contentData + " file ext: " + fileExt, false);



  if (fileExt == "unknown" && !settings.downUnknown) {
    return { fileName: "", needWrite: false };
  }

  // Exclude extensions by regex (mirrors attachment-management's excludeExtensionPattern).
  // Empty pattern excludes nothing.
  const exPattern = settings.ignoredExt.trim();
  if (exPattern.length > 0 && new RegExp(exPattern, "i").test(fileExt)) {
    return { fileName: "", needWrite: false };
  }


  // Build the base filename from the attachment-format template (attachment-management
  // parity): ${originalname} ${md5} ${date} ${notename}.
  const md5 = md5Full(contentData);
  // ${originalname}: cleaned original basename from the URL. data: URIs and nameless links
  // carry no real filename, so fall back to the md5.
  const rawOriginal = path.parse(path.basename(parsedUrl.pathname)).name;
  const originalName = (parsedUrl.protocol === "data:" || !rawOriginal) ? md5 : cFileName(rawOriginal);
  let baseName = cFileName(settings.attachFormat
    .replace("${originalname}", originalName)
    .replace("${md5}", md5)
    .replace("${date}", moment().format(settings.DateFormat))
    .replace("${notename}", noteFile.basename));
  if (!baseName) { baseName = md5; }

  let needWrite = true;
  let fileName = "";
  const suggestedName = pathJoin([dir, cFileName(`${baseName}` + `.${fileExt}`)]);
  if (await adapter.exists(suggestedName, false)) {
    const existing_file_md5 = md5Full(await adapter.readBinary(suggestedName));
    if (existing_file_md5 === md5) {
      // Same content already there — reuse, don't rewrite.
      fileName = suggestedName;
      needWrite = false;
    }
    else {
      // Name taken by different content — disambiguate with a random suffix.
      fileName = pathJoin([dir, cFileName(`${baseName}_${Math.random().toString(9).slice(2,)}` + `.${fileExt}`)]);
    }

  } else {
    fileName = suggestedName;
  }

  logError("File name: " + fileName, false);
  if (!fileName) {
    throw new Error("Failed to generate file name for media file.");
  }

  return { fileName, needWrite };
}
