// version: v1.06
const APP_VERSION = "v1.06";

// 仅支持 BSC 主网
const SUPPORTED_CHAIN_HEX = "0x38";
const SUPPORTED_CHAIN_DEC = 56;

// 会话有效期（毫秒）——30 分钟
const SESSION_TTL_MS = 30 * 60 * 1000;

// 主题模式： "auto" | "manual"
// - auto   ：自动从 tupian/bg.jpg 提色（有缓存会优先用缓存色）
// - manual ：强制使用下面两种颜色做首屏占位（推荐你把它们改成与你图片一致的两种主色）
const THEME_MODE = "manual";  // ← 若你想继续自动提色，改成 "auto"

// 手动主题颜色（当 THEME_MODE="manual" 时生效）——请改为与你的背景图一致的主/次色
const THEME_MANUAL_MAIN = "#102030";      // 例：深色主色
const THEME_MANUAL_SECONDARY = "#1C2F44"; // 例：次色/渐变尾色

// 背景图是否跨域加载（当 bg.jpg 不在同域时置 true）
const IMAGE_CROSSORIGIN = false;

// 本地存储键
const LS_KEY = {
  SESSION: "session",     // {addr, chainId, ts}
  THEME:   "themeColors", // {main, secondary}
};
