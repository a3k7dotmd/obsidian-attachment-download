import { App, Modal } from "obsidian";
import { APP_TITLE } from "./config";
import LocalImagesPlugin from "./main";


export class ModalW1 extends Modal {

	plugin: LocalImagesPlugin;
	messg: string = "";
	titl: string = APP_TITLE;
	callbackFunc: CallableFunction = null;


	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl, titleEl } = this;
		titleEl.setText(this.titl);
		contentEl.createDiv({ text: this.messg });

		const buttonRow = contentEl.createDiv("modal-button-container");
		buttonRow.style.gap = "0.5em";
		buttonRow.style.marginTop = "1.5em";

		const confirmBtn = buttonRow.createEl("button", {
			cls: ["mod-warning"],
			text: "Confirm",
		});
		confirmBtn.addEventListener("click", async () => {
			this.close();
			if (this.callbackFunc) {
				this.callbackFunc();
			}
		});

		const cancelBtn = buttonRow.createEl("button", { text: "Cancel" });
		cancelBtn.addEventListener("click", async () => {
			this.close();
		});

		// Focus Cancel so a reflexive Enter (right after picking the command) cancels safely.
		cancelBtn.focus();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}


export class ModalW2 extends Modal {

	plugin: LocalImagesPlugin;
	messg: string = "";
	titl: string = APP_TITLE;

	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl, titleEl } = this;
		titleEl.setText(this.titl);
		contentEl.createDiv({ text: this.messg });

		const buttonRow = contentEl.createDiv("modal-button-container");
		buttonRow.style.marginTop = "1.5em";

		const okBtn = buttonRow.createEl("button", {
			cls: ["mod-cta"],
			text: "OK",
		});
		okBtn.addEventListener("click", async () => {
			this.close();
		});
		okBtn.focus();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
