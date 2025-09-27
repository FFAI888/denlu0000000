// version: v1.04
const APP_VERSION = "v1.04";

/** 仅支持 BSC 主网 */
const SUPPORTED_CHAIN_HEX = "0x38"; // 56
const SUPPORTED_CHAIN_DEC = 56;

/** 会话有效期（毫秒） */
const SESSION_TTL_MS = 30 * 60 * 1000;

/** 背景图片（可选） */
const BG_IMAGE_SRC = "tupian/bg.jpg";
const BG_IMAGE_VERSION = "1";
const IMAGE_CROSSORIGIN = false;

/** 固定 HSB 主题（你指定） */
const THEME_FIXED_HSB = { enabled: true, h: 214, s: 98, b: 100 };

/** 本地存储键 */
const LS_KEY = {
  SESSION: "session",        // {addr, chainId, ts}
  THEME:   "themeColorsV2",  // {main, secondary, ver}
};
