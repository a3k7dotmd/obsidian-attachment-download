export const APP_TITLE = "Attachment Download  0.18.9";




//Option to enable debugging

let VERBOSE = false;

function setDebug(value: boolean = false){
    VERBOSE =  value;
}

export {VERBOSE, setDebug};




export const SUPPORTED_OS = {"win":"win32","unix":"linux,darwin,freebsd,openbsd"};

export const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82  Safari/537.36';

//html embedded image
export const HTML_EMBED = /(?<htmlem>\[{0,1}\<img.+?(?<src>src=.+?)\>)/gm

export const ANCHOR_S = /(?<anchor>.+)\|(?<size>[0-9]+)/g

export const MD_SEARCH_PATTERN =
[
//file link
/\!\[(?<anchor>(.{0}|(?!^file\:\/)+?))\]\((?<link>((file\:\/)[^\!]+?(\.{1}.{3,4}\) {0,1}|\)$|\)\n|\)])))/gm,
//hypertext link
///\!\[(?<anchor>(.{0}|[^\[]+?))\]\((?<link>((http(s){0,1}).+?(\) |\..{3,4}\)|\)$|\)\n|\)\]|\)\[)))/gm,
 
/\!\[(?<anchor>([^\]]*))\]\((?<link>((http(s){0,1}).+?(\) |\..{3,4}\)|\)$|\)\n|\)\]|\)\[)))/gm,

//Base64 encoded data
// NOTE: anchors exclude "]" so a match can never bleed across an already-localized
// embed into a following "](...)" wrapper link and garble the tag.
/\!\[[^\[\]](?<anchor>(.{0}|[^\[\]]+?))\]\((?<link>((data\:.+?base64\,).+?(\) |\..{3,4}\)|\)$|\)\n|\)\]|\)\[)))/gm,
/\!\[(?<anchor>(.{0}|[^\[\]]+?))\]\((?<link>((http(s){0,1}|(data\:.+?base64\,)).+?\)))/gm
]

// A clipped "clickable image": an image embed wrapped in a link to the SAME url,
// [![alt](url)](url "title"). Collapsed to a single embed before processing
// (collapseSelfLinkedImages) so the url is downloaded once and no wrapper web-link
// is left behind for a later pass to garble.
export const CLICKABLE_IMAGE_PATTERN = /\[!\[([^\]]*)\]\(([^()\s]+)(?:\s+"[^"]*")?\)\]\(([^()\s]+)((?:\s+"[^"]*")?)\)/g


export const FRONTMATTER_SEARCH_PATTERN =
[
///\[\[(?<link>((http(s){0,1}).+?(\) |\..{3,4}|\]\]|\]\]$|\]\]\n)))/gm,
/\[{2}(?<loclink>(.+?(\) |\..{3,4}\]{2}|\]{2}|\]{2}$|\]{2}\n)))/i,
]

export const MD_LINK = /\http(s){0,1}.+?( {1}|\)\n)/g;

export const ANY_URL_PATTERN = /[a-zA-Z\d]+:\/\/(\w+:\w+@)?([a-zA-Z\d.-]+\.[A-Za-z]{2,4})(:\d+)?(\/.*)?/i;

export const ATT_SIZE_ACHOR = /(^(?<attdesc>.{1,})\|(?<attsize>[0-9]{2,4})$)|(?<attsize2>^[0-9]{2,4}$)/gm

export const TIME_DIFF = 500;

// Looks like timeouts in Obsidian API are set in milliseconds
export const NOTICE_TIMEOUT = 5 * 1000;
export const TIMEOUT_LIKE_INFINITY = 24 * 60 * 60 * 1000;
export const FORBIDDEN_SYMBOLS_FILENAME_PATTERN = /\s+/g;

export interface ISettings {
  processCreated: boolean,
  ignoredExt: string,
  useCaptions: boolean,
  downUnknown: boolean,
  saveAttE: string,
  realTimeUpdate: boolean;
  filesizeLimit: number,
  tryCount: number,
  realTimeUpdateInterval: number;
  addNameOfFile: boolean;
  showNotifications: boolean;
  includeps: string;
  includepattern: string;
  attachmentRoot: string;
  attachmentPath: string;
  attachFormat: string;
  mediaSettingsVersion: number;
  disAddCom: boolean;
  disRibbon: boolean;
  PngToJpeg: boolean;
  JpegQuality: number;
  DateFormat: string;
  ImgCompressionType:string;
  ExcludedFoldersList:string;
  excludeSubpaths: boolean
}

export const DEFAULT_SETTINGS: ISettings = {
  processCreated: true,
  ignoredExt: "cnt|php|html?",
  useCaptions: true,
  downUnknown: false,
  saveAttE: "obsFolder",
  realTimeUpdate: true,
  filesizeLimit: 0,
  tryCount: 2,
  realTimeUpdateInterval: 5,
  addNameOfFile: true,
  showNotifications: true,
  includeps: "md|canvas",
  includepattern: "(?<md>.*\\.md$)|(?<canvas>.*\\.canvas$)",
  attachmentRoot: "",
  attachmentPath: "${notepath}/${notename}",
  attachFormat: "${originalname}",
  mediaSettingsVersion: 1,
  disAddCom: false,
  disRibbon: false,
  PngToJpeg: false,
  JpegQuality: 80,
  DateFormat: "YYYY MM DD",
  ImgCompressionType: "image/jpeg",
  ExcludedFoldersList: "",
  excludeSubpaths: false
};
