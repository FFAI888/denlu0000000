// version: v1.07
const APP_VERSION = "v1.07";

/** 链配置（保持不变） */
const SUPPORTED_CHAIN_HEX = "0x38"; // BSC
const SUPPORTED_CHAIN_DEC = 56;
const SESSION_TTL_MS = 30 * 60 * 1000;

/** 背景配置（新增/增强） */
const THEME_MODE = "auto_strict";        // "manual" | "auto" | "auto_strict"
const THEME_MANUAL_MAIN = "#102030";     // manual 模式下使用
const THEME_MANUAL_SECONDARY = "#1C2F44";
const BG_IMAGE_SRC = "tupian/bg.jpg";    // 背景图路径
const BG_IMAGE_VERSION = "1";            // 换图时把版本改掉即可强制重新识别
const IMAGE_CROSSORIGIN = false;         // 跨域加载时设为 true（需图片服务器允许 CORS）

/** 本地存储键 */
const LS_KEY = {
  SESSION: "session",        // {addr, chainId, ts}
  THEME:   "themeColorsV2",  // {main, secondary, ver}
};
