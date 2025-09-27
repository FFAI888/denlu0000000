// version: v1.01
const APP_VERSION = "v1.01";

/** 仅支持 BSC 主网 */
const SUPPORTED_CHAIN_HEX = "0x38"; // 56
const SUPPORTED_CHAIN_DEC = 56;

/** 会话有效期（毫秒） */
const SESSION_TTL_MS = 30 * 60 * 1000;

/** 背景图片（可选） */
const BG_IMAGE_SRC = "tupian/bg.jpg";
const BG_IMAGE_VERSION = "1";
const IMAGE_CROSSORIGIN = false;

/** ✅ 固定 HSB 主题（你指定） */
const THEME_FIXED_HSB = { enabled: true, h: 214, s: 98, b: 100 }; // s/b 用百分比

/** 本地存储键 */
const LS_KEY = {
  SESSION: "session",        // {addr, chainId, ts}
  THEME:   "themeColorsV2",  // {main, secondary, ver}
};

/** 用于页面右上“文件名（版本，修改的/未修改的）” */
const CHANGE_LOG = [
  { file: "index.html", status: "已修改", ver: APP_VERSION, note: "首帧主题改为 HSB(214,98,100)" },
  { file: "home.html",  status: "未修改", ver: APP_VERSION, note: "" },
  { file: "style.css",  status: "未修改", ver: APP_VERSION, note: "" },
  { file: "config.js",  status: "已修改", ver: APP_VERSION, note: "新增固定HSB主题配置" },
  { file: "app.js",     status: "已修改", ver: APP_VERSION, note: "应用固定HSB到全站" },

  { file: "tupian/logo.png", status: "未修改", ver: APP_VERSION, note: "" },
  { file: "tupian/bg.jpg",   status: "未修改", ver: APP_VERSION, note: "" },
];
