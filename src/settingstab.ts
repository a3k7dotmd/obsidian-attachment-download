import {
    App,
    PluginSettingTab,
    Setting,
} from "obsidian"

import {
    displayError,
    logError,
    trimAny
} from "./utils"

import {
    APP_TITLE,
    setDebug,
    VERBOSE
} from "./config"

import LocalImagesPlugin from "./main"
import safeRegex from "safe-regex"




export default class SettingTab extends PluginSettingTab {
    plugin: LocalImagesPlugin

    constructor(app: App, plugin: LocalImagesPlugin) {
        super(app, plugin)
        this.plugin = plugin
    }

    displSw(cont: any): void {
        cont.findAll(".setting-item").forEach((el: any) => {
            if (el.getAttr("class").includes("root_folder_set")) {
                if (this.plugin.settings.saveAttE === "obsFolder") {
                    el.hide()
                }
                else {
                    el.show()
                }
            }
        })
    }

    display(): void {
        let { containerEl } = this



        containerEl.empty()


        containerEl.createEl("h1", { text: APP_TITLE })

        const donheader = containerEl.createEl("div")
        // donheader.createEl("a", { text: "Support the project! ", href: "https://www.buymeacoffee.com/sergeikorneev", cls: "donheader_txt" })

        containerEl.createEl("h3", { text: "Interface settings" })

        new Setting(containerEl)
            .setName("Show notifications")
            .setDesc("Show notifications when pages were processed.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.showNotifications)
                    .onChange(async (value) => {
                        this.plugin.settings.showNotifications = value
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName("Disable additional commands")
            .setDesc("Do not show additional commands in command palette. Reload the plugin in settings to take effect (turn off/on).")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.disAddCom)
                    .onChange(async (value) => {
                        this.plugin.settings.disAddCom = value
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName("Disable ribbon action icon")
            .setDesc("Do not show dice icon for action Download attachments for the current note. Reload the plugin (turn off/on) to take effect.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.disRibbon)
                    .onChange(async (value) => {
                        this.plugin.settings.disRibbon = value
                        await this.plugin.saveSettings()
                    })
            )

        containerEl.createEl("h3", { text: "Processing settings" })



        new Setting(containerEl)
            .setName("Automatic processing")
            .setDesc("Process notes on create/copy/paste.")

            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.realTimeUpdate)
                    .onChange(async (value) => {
                        this.plugin.settings.realTimeUpdate = value
                        await this.plugin.saveSettings()
                        this.plugin.setupQueueInterval()
                    })
            )

        new Setting(containerEl)
            .setName("Automatic processing interval")
            .setDesc("Interval in seconds for processing update. It takes some time to reveal changed content of a note to plugins.")
            .addText((text) =>
                text
                    .setValue(String(this.plugin.settings.realTimeUpdateInterval))
                    .onChange(async (value: string) => {

                        let numberValue = Number(value)
                        if (
                            isNaN(numberValue) ||
                            !Number.isInteger(numberValue) ||
                            numberValue <= 5 ||
                            numberValue > 3600
                        ) {


                            displayError(

                                "The value should be a positive integer number between 5 and 3600!"
                            )
                            return
                        }

                        if (numberValue < 5) {
                            numberValue = 5
                        }
                        this.plugin.settings.realTimeUpdateInterval = numberValue
                        await this.plugin.saveSettings()
                        this.plugin.setupQueueInterval()
                    })
            )



        new Setting(containerEl)
            .setName("Number of retries for every single attachment")
            .setDesc("If an error occurs during downloading (network etc.) try to re-download several times.")
            .addText((text) =>
                text
                    .setValue(String(this.plugin.settings.tryCount))
                    .onChange(async (value: string) => {

                        let numberValue = Number(value)
                        if (
                            isNaN(numberValue) ||
                            !Number.isInteger(numberValue) ||
                            numberValue < 1 ||
                            numberValue > 6
                        ) {
                            displayError(
                                "The value should be a positive integer number between 1 and 6!"
                            )
                            return
                        }
                        this.plugin.settings.tryCount = numberValue
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName("Automatically process opened notes")
            .setDesc("When you open a note (e.g. a freshly-clipped one) with external media links, download and localize them. Turn off to localize only via the command.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.processCreated)
                    .onChange(async (value) => {
                        this.plugin.settings.processCreated = value
                        await this.plugin.saveSettings()
                    })
            )



        new Setting(containerEl)
            .setName("Download unknown filetypes")
            .setDesc("Download unknown filetypes and save them with .unknown extension.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.downUnknown)
                    .onChange(async (value) => {
                        this.plugin.settings.downUnknown = value
                        await this.plugin.saveSettings()
                    })
            )
        new Setting(containerEl)
            .setName("Compress PNG images")
            .setDesc("Compress all downloaded PNG images (other formats are left untouched). May reduce file size by several times, but can also affect performance.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.PngToJpeg)
                    .onChange(async (value) => {
                        this.plugin.settings.PngToJpeg = value
                        await this.plugin.saveSettings()
                    })
            )




        new Setting(containerEl)
            .setName("Compression type")
            .setDesc("Select image compression type. Keep in mind that webp format has image size limitations.")
            .addDropdown(dropdown => {
                dropdown
                    .addOption("image/webp", "WebP")
                    .addOption("image/jpeg", "JPEG")
                    .setValue(this.plugin.settings.ImgCompressionType)
                    .onChange(async (value) => {
                        this.plugin.settings.ImgCompressionType = value;
                        await this.plugin.saveSettings();
                    });
            });


        new Setting(containerEl)
            .setName("Image Quality")
            .setDesc("Image quality selection (30 to 100).")
            .addText((text) =>
                text
                    .setValue(String(this.plugin.settings.JpegQuality))
                    .onChange(async (value: string) => {

                        let numberValue = Number(value)
                        if (
                            isNaN(numberValue) ||
                            !Number.isInteger(numberValue) ||
                            numberValue < 10 ||
                            numberValue > 100
                        ) {
                            displayError(
                                "The value should be a positive integer number between 10 and 100!"
                            )
                            return
                        }
                        this.plugin.settings.JpegQuality = numberValue
                        await this.plugin.saveSettings()
                    })
            )


        new Setting(containerEl)
            .setName("File size lower limit in Kb")
            .setDesc("Do not download files with size less than this value. Set 0 for no limit.")
            .addText((text) =>
                text
                    .setValue(String(this.plugin.settings.filesizeLimit))
                    .onChange(async (value: string) => {

                        let numberValue = Number(value)
                        if (
                            isNaN(numberValue) ||
                            !Number.isInteger(numberValue) ||
                            numberValue < 0
                        ) {


                            displayError(

                                "The value should be a positive integer!"
                            )
                            return
                        }

                        if (numberValue < 0) {
                            numberValue = 0
                        }
                        this.plugin.settings.filesizeLimit = numberValue
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName("Exclude extension pattern")
            .setDesc("Regex pattern to exclude certain extensions from being downloaded (mirrors attachment-management). E.g. pdf|docx?|xlsx?|pptx?|zip|rar. Leave empty to download all.")
            .addText((text) =>
                text
                    .setPlaceholder("pdf|docx?|xlsx?|pptx?|zip|rar")
                    .setValue(this.plugin.settings.ignoredExt)
                    .onChange(async (value) => {
                        if (value.length > 0 && !safeRegex(value)) {
                            displayError("Unsafe regex! https://www.npmjs.com/package/safe-regex")
                            return
                        }
                        this.plugin.settings.ignoredExt = value
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName("Excluded paths")
            .setDesc("Provide the full path of the folder names (case sensitive and without leading slash '/') divided by semicolon (;) to be excluded from processing.")
            .addTextArea((text) => {
                text
                    .setPlaceholder("Folder/Subfolder; Another/Folder")
                    .setValue(this.plugin.settings.ExcludedFoldersList)
                    .onChange(async (value) => {
                        this.plugin.settings.ExcludedFoldersList = value
                        await this.plugin.saveSettings()
                    })
                text.inputEl.rows = 3
                text.inputEl.style.width = "100%"
            })

        new Setting(containerEl)
            .setName("Exclude subpaths")
            .setDesc("Turn on this option if you want to also exclude all subfolders of the folder paths provided above.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.excludeSubpaths)
                    .onChange(async (value) => {
                        this.plugin.settings.excludeSubpaths = value
                        await this.plugin.saveSettings()
                    })
            )




        containerEl.createEl("h3", { text: "Note settings" })

        new Setting(containerEl)
            .setName("Preserve link captions")
            .setDesc("Add media links captions to converted tags.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.useCaptions)
                    .onChange(async (value) => {
                        this.plugin.settings.useCaptions = value
                        await this.plugin.saveSettings()
                    })
            )


        new Setting(containerEl)
            .setName("Add original filename or 'Open file' tag")
            .setDesc("Add [[original filename]] or [original filename](link to attachment) after replaced tag (only for file:// protocol).")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.addNameOfFile)
                    .onChange(async (value) => {
                        this.plugin.settings.addNameOfFile = value
                        await this.plugin.saveSettings()
                    })
            )




        new Setting(containerEl)
            .setName("Include pattern")
            .setDesc(
                "Include only files with extensions only matching this pattern. Example: md|canvas"
            )
            .addText((text) =>
                text.setValue(this.plugin.settings.includeps).onChange(async (value) => {

                    //Transform string to regex
                    let ExtArray = value.split("|")
                    if (ExtArray.length >= 1) {
                        let regexconverted = trimAny(ExtArray.map((extension) => { if (trimAny(extension, [" ", "|"]) !== "") { return "(?<" + trimAny(extension, [" ", "|"]) + ">.*\\." + trimAny(extension, [" ", "|"]) + "$)" } }).join("|"), [" ", "|"])


                        if (!safeRegex(value)) {
                            displayError(
                                "Unsafe regex! https://www.npmjs.com/package/safe-regex"
                            )
                            return
                        }
                        this.plugin.settings.includepattern = regexconverted
                        logError(regexconverted)
                        await this.plugin.saveSettings()
                    }
                })
            )




        containerEl.createEl("h3", { text: "Media folder settings" })

        new Setting(containerEl)
            .setName("Root path to save attachment")
            .setDesc("Select root path of attachment.")
            .addDropdown((text) =>
                text
                    .addOption("obsFolder", "Copy Obsidian settings")
                    .addOption("inFolderBelow", "In the folder specified below")
                    .addOption("nextToNote", "Next to note in folder specified below")
                    .setValue(this.plugin.settings.saveAttE)
                    .onChange(async (value) => {
                        this.plugin.settings.saveAttE = value
                        this.displSw(containerEl)
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName("Root folder")
            .setDesc("Root folder of new attachment.")
            .setClass("root_folder_set")
            .addText((text) =>
                text
                    .setPlaceholder("e.g. _resources")
                    .setValue(this.plugin.settings.attachmentRoot)
                    .onChange(async (value) => {
                        this.plugin.settings.attachmentRoot = value
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName("Attachment path")
            .setDesc("Path of attachment in root folder, available variables ${notepath}, ${notename}, ${parent}.")
            .addText((text) =>
                text
                    .setPlaceholder("${notepath}/${notename}")
                    .setValue(this.plugin.settings.attachmentPath)
                    .onChange(async (value) => {
                        this.plugin.settings.attachmentPath = value
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName("Attachment format")
            .setDesc("Define how to name the attachment file, available variables ${date}, ${notename}, ${md5} and ${originalname}.")
            .addText((text) =>
                text
                    .setPlaceholder("${originalname}")
                    .setValue(this.plugin.settings.attachFormat)
                    .onChange(async (value) => {
                        this.plugin.settings.attachFormat = value
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName("Date format")
            .setDesc("Moment date format for the ${date} variable. E.g. YYYYMMDDHHmmssSSS, or 'MMM Do YY' (Mar 20th 24).")
            .addText((text) =>
                text.setValue(this.plugin.settings.DateFormat).onChange(async (value) => {
                    if (value.match(/(\)|\(|\"|\'|\#|\]|\[|\:|\>|\<|\*|\|)/g) !== null) {
                        displayError(
                            "Unsafe folder name! Some chars are forbidden in some filesystems."
                        )
                        return
                    }
                    this.plugin.settings.DateFormat = value
                    await this.plugin.saveSettings()
                })
            )


        containerEl.createEl("h3", { text: "Troubleshooting" })
        new Setting(containerEl)
            .setName("Debug")
            .setDesc("Enable debug output to console.")
            .addToggle((toggle) =>
                toggle
                    .setValue(VERBOSE)
                    .onChange(async (value) => {
                        setDebug(value)
                        await this.plugin.saveSettings()
                    })
            )

        this.displSw(containerEl)
    }
}
