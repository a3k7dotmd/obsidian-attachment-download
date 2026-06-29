import {
  Notice,
  Plugin,
  TFile,
  Editor,
  htmlToMarkdown,
  MarkdownView,
} from "obsidian"

import SettingTab from "./settingstab"

import {
  imageTagProcessor,
} from "./contentProcessor"

import {
  replaceAsync,
  cFileName,
  trimAny,
  logError,
  showBalloon,
  displayError,
  encObsURI,
  pathJoin,
} from "./utils"

import {
  APP_TITLE,
  ISettings,
  DEFAULT_SETTINGS,
  MD_SEARCH_PATTERN,
  NOTICE_TIMEOUT,
  TIMEOUT_LIKE_INFINITY,
  TIME_DIFF
} from "./config"

import { UniqueQueue } from "./uniqueQueue"
import { ModalW1 } from "./modal"






//import { count, log } from "console"

export default class LocalImagesPlugin extends Plugin {
  settings: ISettings
  modifiedQueue = new UniqueQueue<TFile>()
  intervalId = 0
  // Paths the plugin itself just rewrote (path -> timestamp). Used to ignore the spurious
  // "create" event a CIFS/network-mount watcher fires for our own vault.modify(), which would
  // otherwise reprocess the note forever.
  justModifiedByPlugin = new Map<string, number>()
  async onload() {

    await this.loadSettings()

    this.addCommand({
      id: "download-images",
      name: "Download attachments for the current note",
      callback: this.processActivePage(false),
    })

    if (!this.settings.disRibbon) {

      this.addRibbonIcon("dice", "Download attachments for the current note", () => {
        this.processActivePage(false)()
      });

    }

    if (!this.settings.disAddCom) {

      this.addCommand({
        id: "set-title-as-name",
        name: "Set the first found # header as note name for the current note",
        callback: this.setTitleAsName,
      })

      this.addCommand({
        id: "download-images-all",
        name: "Download attachments for all your notes",
        callback: this.confirmAction("Download attachments for ALL your notes?", this.processAllPages),
      })

      this.addCommand({
        id: "convert-selection-to-URI",
        name: "Convert selection to URI",
        callback: this.convertSelToURI,
      })

      this.addCommand({
        id: "convert-selection-to-md",
        name: "Convert selection from html to markdown",
        callback: this.convertSelToMD,
      })
    }





    // Auto-process a SINGLE note when it is created (brought in by a clipper, sync, another program
    // or an LLM) or when you open it — never the whole vault (that's the command's job), and never
    // background files: ExemplaryOfMD now matches only real ".md"/".canvas" files (not e.g. Obsidian's
    // "obsidian.md-<ts>.log" console logs), and maybeProcessNote ignores notes the plugin itself just
    // wrote and notes that have no external link to localize.
    this.registerEvent(this.app.vault.on('create', (file: TFile) => {
      this.maybeProcessNote(file)
    }))
    this.registerEvent(this.app.workspace.on('file-open', (file: TFile) => {
      this.maybeProcessNote(file)
    }))


    this.registerEvent(this.app.workspace.on(

      "editor-paste",
      (evt: ClipboardEvent, editor: Editor, info: MarkdownView) => {
        this.onPasteFunc(evt, editor, info)

      }
    ))

    this.setupQueueInterval()
    this.addSettingTab(new SettingTab(this.app, this))

  }





  setupQueueInterval() {
    if (this.intervalId) {
      const intervalId = this.intervalId
      this.intervalId = 0
      window.clearInterval(intervalId)
    }
    if (
      this.settings.realTimeUpdate &&
      this.settings.realTimeUpdateInterval > 0
    ) {
      this.intervalId = window.setInterval(
        this.processModifiedQueue,
        this.settings.realTimeUpdateInterval * 1000
      )
      this.registerInterval(this.intervalId)
    }
  }


  private getCurrentNote(): TFile | null {
    try {
      const noteFile = app.workspace.activeEditor.file
      return noteFile
    } catch (e) {
      showBalloon("Cannot get current note! ", this.settings.showNotifications)

    }
    return null

  }


  private async processPage(file: TFile, defaultdir: boolean = false): Promise<any> {
    
 
    if (file == null ) {return null}

    const content = await this.app.vault.cachedRead(file)
    if (content.length == 0) {return null}
      

    const fixedContent = await replaceAsync(
      content,
      MD_SEARCH_PATTERN,
      imageTagProcessor(this,
        file,
        this.settings,
        defaultdir
      )
    )





    if (content != fixedContent[0] && fixedContent[1] === false) {
      this.modifiedQueue.remove(file)
      await this.app.vault.modify(file, fixedContent[0])
      this.justModifiedByPlugin.set(file.path, Date.now())

      showBalloon(`Attachments for "${file.path}" were processed.`, this.settings.showNotifications)

    }

    else if (content != fixedContent[0] && fixedContent[1] === true) {

      this.modifiedQueue.remove(file)
      await this.app.vault.modify(file, fixedContent[0])
      this.justModifiedByPlugin.set(file.path, Date.now())

      showBalloon(`WARNING!\r\nAttachments for "${file.path}" were processed, but some attachments were not downloaded/replaced...`, this.settings.showNotifications)
    }
    else {
      if (this.settings.showNotifications) {
        showBalloon(`Page "${file.path}" has been processed, but nothing was changed.`, this.settings.showNotifications)
      }
    }
  }

  // using arrow syntax for callbacks to correctly pass this context

  processActivePage = (defaultdir: boolean = false) => async () => {
    logError("processActivePage")
    try {
      const activeFile = this.getCurrentNote()
      await this.processPage(activeFile, defaultdir)
    } catch (e) {
      showBalloon(`Please select a note or click inside selected note in canvas.`, this.settings.showNotifications)
      return
    }
  }

  processAllPages = async () => {
    const files = this.app.vault.getMarkdownFiles()
 
    const pagesCount = files.length

    const notice = this.settings.showNotifications

      ? new Notice(
        APP_TITLE + `\nStart processing. Total ${pagesCount} pages. `,
        TIMEOUT_LIKE_INFINITY
      )
      : null

    for (const [index, file] of files.entries()) {
      if (this.ExemplaryOfMD(file.path)) {
        if (notice) {
          //setMessage() is undeclared but factically existing, so ignore the TS error  //@ts-expect-error
          notice.setMessage(
            APP_TITLE + `\nProcessing \n"${file.path}" \nPage ${index} of ${pagesCount}`
          )
        }
        await this.processPage(file)
      }
    }
    if (notice) {
      // dum @ts-expect-error
      notice.setMessage(APP_TITLE + `\n${pagesCount} pages were processed.`)

      setTimeout(() => {
        notice.hide()
      }, NOTICE_TIMEOUT)
    }
  }




  private async onPasteFunc(evt: ClipboardEvent = undefined, editor: Editor = undefined, info: MarkdownView = undefined) {

    if (evt === undefined) { return }

    if (!this.settings.realTimeUpdate) { return }

    try {
      const activeFile = this.getCurrentNote()
      const fItems = evt.clipboardData.files
      const tItems = evt.clipboardData.items
 
      if (fItems.length != 0 || this.ThePathExcluded(String(activeFile.parent?.path))) { return }
      
      for (const key in tItems) {

        // Check if it was a text/html
        if (tItems[key].kind == "string") {
          
          if (this.settings.realTimeUpdate) {
            
            const cont = htmlToMarkdown(evt.clipboardData.getData("text/html")) +
            
            htmlToMarkdown(evt.clipboardData.getData("text"))
            



            for (const reg_p of MD_SEARCH_PATTERN) {
              if (reg_p.test(cont)) {
                logError("content: " + cont)
                showBalloon("Media links were found, processing...", this.settings.showNotifications)

                this.enqueueActivePage(activeFile)
                this.setupQueueInterval()
                break
              }
            }
          }
          return
        }

      }




    } catch (e) {
      showBalloon(`Please select a note or click inside selected note in canvas.`, this.settings.showNotifications)
      return
    }



  }




  private confirmAction = (message: string, onConfirm: CallableFunction) => () => {
    const mod = new ModalW1(this.app)
    mod.plugin = this
    mod.titl = "Action confirmation"
    mod.messg = message
    mod.callbackFunc = onConfirm
    mod.open()
  }


  private async maybeProcessNote(file: TFile) {

    if (!file ||
      !(file instanceof TFile) ||
      !(this.settings.processCreated) ||
      !this.ExemplaryOfMD(file.path) ||
      this.ThePathExcluded(String(file.parent?.path)))
      return

    // Don't re-trigger on the note the plugin itself just rewrote.
    const lastMod = this.justModifiedByPlugin.get(file.path)
    if (lastMod !== undefined && Date.now() - lastMod < 5000) {
      return
    }

    // Only act when the open note actually has an external media link to localize, so merely
    // opening/switching notes never fires a needless pass.
    const content = await this.app.vault.cachedRead(file)
    let hasLink = false
    for (const reg_p of MD_SEARCH_PATTERN) {
      reg_p.lastIndex = 0
      if (reg_p.test(content)) { hasLink = true; break }
    }
    if (!hasLink) { return }

    logError("func maybeProcessNote: " + file.path)
    this.enqueueActivePage(file)
    this.setupQueueInterval()
  }

  private ExemplaryOfMD(pat: string){
    // Anchor at end so ONLY real ".md" files match — not paths that merely CONTAIN ".md"
    // (e.g. Obsidian "obsidian.md-<timestamp>.log" console logs / temp files, which were being
    // localized as if they were notes and driving an infinite reprocessing loop).
    const includeRegex = new RegExp("(?:" + this.settings.includepattern + ")$", "i")
    return (pat.match(includeRegex)?.groups?.md != undefined)
  }




  private ThePathExcluded(pat: string){
    // Excluded paths are semicolon-separated folder paths (case sensitive, no leading slash).
    // "Exclude subpaths" off => only the exact folder is excluded; on => its subfolders too.
    const list = this.settings.ExcludedFoldersList.split(";").map((s) => s.trim()).filter((s) => s.length)
    if (list.length === 0) { return false }
    const p = trimAny(pat, ["/", "\\", " "])
    for (const ex of list) {
      const exTrim = trimAny(ex, ["/", "\\", " "])
      if (p === exTrim || (this.settings.excludeSubpaths && p.startsWith(exTrim + "/"))) {
        return true
      }
    }
    return false
  }

  private setTitleAsName = async () => {
    try {
      const noteFile = this.getCurrentNote()
      const fileData = await this.app.vault.cachedRead(noteFile)
      const title = fileData.match(/^#{1,6} .+?($|\n)/gm)
      var ind = 0
      if (title !== null) {
        const newName = cFileName(trimAny(title[0].toString(), ["#", " "])).slice(0, 200)
        var fullPath = pathJoin([noteFile.parent.path, newName + ".md"])
        var fExist = await this.app.vault.exists(fullPath)
        if (trimAny(noteFile.path, ["\\", "/"]) != trimAny(fullPath, ["\\", "/"])) {
          while (fExist) {
            ind++
            var fullPath = pathJoin([noteFile.parent.path, newName + " (" + ind + ")" + ".md"])
            var fExist = await this.app.vault.exists(fullPath)
          }
          await this.app.vault.rename(noteFile, fullPath)

          showBalloon(`The note was renamed to ` + fullPath, this.settings.showNotifications)

        }
      }

    } catch (e) {
      showBalloon(`Cannot rename.`, this.settings.showNotifications)
      return
    }
  }





  private convertSelToURI = async () => {
    this.app.workspace.activeEditor.editor.replaceSelection(encObsURI(await this.app.workspace.activeEditor.getSelection()))
  }

  private convertSelToMD = async () => {
    this.app.workspace.activeEditor.editor.replaceSelection(htmlToMarkdown(await this.app.workspace.activeEditor.getSelection()))
  }



  processModifiedQueue = async () => {
    const iteration = this.modifiedQueue.iterationQueue();
    for (const page of iteration) {
      this.processPage(page, false);
    }
  };

  enqueueActivePage(activeFile: TFile) {
    this.modifiedQueue.push(
      activeFile,
      1//this.settings.realTim3AttemptsToProcess
    )
  }




  // ------------  Load / Save settings -----------------



  async onunload() {
    this.app.workspace.off("editor-drop", null)
    this.app.workspace.off("editor-paste", null)
    this.app.workspace.off('file-menu', null)
    //this.app.vault.off("create",  null)
    logError(" unloaded.")
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
    await this.migrateMediaSettings()
    this.setupQueueInterval()
  }

  // One-time migration from the legacy mediaRootDir / useMD5ForNewWebAtt model to the
  // attachment-management {root}/{path}/{format} model. Splits mediaRootDir at its first
  // ${...} segment into attachmentRoot + attachmentPath, and folds the MD5 toggle into
  // attachFormat. Legacy keys are read via cast (they persist through the settings merge).
  async migrateMediaSettings() {
    const from = this.settings.mediaSettingsVersion
    if (from >= 3) { return }
    const legacy = this.settings as any
    if (from < 2) {
      // v1 -> v2: legacy mediaRootDir / useMD5ForNewWebAtt -> {root}/{path}/{format} model.
      if (this.settings.saveAttE === "nextToNoteS") { this.settings.saveAttE = "nextToNote" }
      if (typeof legacy.mediaRootDir === "string" && legacy.mediaRootDir.length) {
        const parts = (legacy.mediaRootDir as string).split("/").filter((p: string) => p.length)
        const i = parts.findIndex((p: string) => p.includes("${"))
        if (i === -1) {
          this.settings.attachmentRoot = parts.join("/")
          this.settings.attachmentPath = ""
        } else {
          this.settings.attachmentRoot = parts.slice(0, i).join("/")
          this.settings.attachmentPath = parts.slice(i).join("/")
        }
      }
      this.settings.attachFormat = legacy.useMD5ForNewWebAtt ? "${md5}" : "${originalname}"
      for (const k of ["mediaRootDir", "useMD5ForNewWebAtt", "useMD5ForNewAtt", "processAll",
                       "removeMediaFolder", "removeOrphansCompl", "PngToJpegLocal", "DoNotCreateObsFolder"]) {
        delete legacy[k]
      }
    }
    if (from < 3) {
      // v2 -> v3: pathInTags removed — link format now always follows Obsidian's "New link format".
      delete legacy.pathInTags
    }
    this.settings.mediaSettingsVersion = 3
    await this.saveData(this.settings)
  }

  async saveSettings() {
    try {
      await this.saveData(this.settings)
    } catch (error) {
      displayError(error)
    }
  }

  async ensureFolderExists(folderPath: string) {
    try {
      await this.app.vault.createFolder(folderPath)
      return
    } catch (e) {
      logError(e)
      return
    }
  }
}
