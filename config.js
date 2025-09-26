// ✅ 全局配置 (v7.1)
const SESSION_TIMEOUT = 30 * 60 * 1000;
const SUPPORTED_CHAIN_HEX = "0x38"; // BSC
const SUPPORTED_CHAIN_DEC = 56;

const WHITELIST_ADDR = "0xYourContractAddressHere"; // ← 替换为你的合约地址
const ABI = [
  "function isWhitelisted(address) view returns (bool)",
  "function owner() view returns (address)",
  "function transferOwnership(address newOwner) external",
  "function setWhitelisted(address,bool) external",
  "function getWhitelist() view returns(address[])"
];

// ✅ 行情开关
const ENABLE_MARKET = false;  // 默认关闭，改 true 即启用
const MARKET_PAIRS = {
  RONG_USDT: { base:"0x0337...", quote:"0x55d398326f99059f..." },
  CRC_RONG:  { base:"0x5b2f...", quote:"0x0337..." }
};

// ✅ Toast 配置（保持完整）
const toastPosition   = "top-right";
const toastDuration   = 3000;
const toastMax        = 3;
const toastAnimation  = "slide";
const toastTheme      = "dark";
const toastVibrate    = true;
const toastQueueMode  = "stack";
const toastOrder      = "oldest-first";
const toastAlign      = "left";
const toastWidth      = "auto";
const toastBorder     = "none";
const toastShadow     = "0 4px 6px rgba(0,0,0,0.2)";
const toastRadius     = "12px";
const toastBackground = "";

const toastIcon = { success: "✅", error: "❌", warning: "⚠️" };
const toastSound = {
  success: "sounds/success.mp3",
  error: "sounds/error.mp3",
  warning: "sounds/warning.mp3"
};
