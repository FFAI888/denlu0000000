// version: v1.00
const APP_VERSION = "v1.00";

/** 仅支持 BSC 主网 */
const SUPPORTED_CHAIN_HEX = "0x38"; // 56
const SUPPORTED_CHAIN_DEC = 56;

/** 会话有效期（毫秒） */
const SESSION_TTL_MS = 30 * 60 * 1000;

/** 背景配置（可放 /tupian/bg.jpg） */
const BG_IMAGE_SRC = "tupian/bg.jpg";     // 可换成你的图
const BG_IMAGE_VERSION = "1";             // 改这个可强制刷新
const IMAGE_CROSSORIGIN = false;

/** 本地存储键 */
const LS_KEY = {
  SESSION: "session",        // {addr, chainId, ts}
  THEME:   "themeColorsV2",  // {main, secondary, ver}
};

/** ✅ 用于显示“文件名（版本，修改的/未修改的）” */
const CHANGE_LOG = [
  { file: "index.html", status: "已修改", ver: APP_VERSION, note: "新建登录页" },
  { file: "home.html",  status: "已修改", ver: APP_VERSION, note: "新建首页" },
  { file: "style.css",  status: "已修改", ver: APP_VERSION, note: "基础样式+右上文件提示" },
  { file: "config.js",  status: "已修改", ver: APP_VERSION, note: "配置与清单" },
  { file: "app.js",     status: "已修改", ver: APP_VERSION, note: "连接/守卫/渲染提示" },

  // 资源文件（请自行添加图片）
  { file: "tupian/logo.png", status: "未修改", ver: APP_VERSION, note: "占位" },
  { file: "tupian/bg.jpg",   status: "未修改", ver: APP_VERSION, note: "占位" },
];
