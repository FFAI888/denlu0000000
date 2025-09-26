// version: v1.0
// 可配置项集中在此，便于以后维护版本递增与网络切换

// DApp 版本（用于页面徽标展示）
const APP_VERSION = "v1.0";

// 仅支持 BSC 主网：十六进制 chainId 为 0x38（十进制 56）
const SUPPORTED_CHAIN_HEX = "0x38";
const SUPPORTED_CHAIN_DEC = 56;

// 本地存储键名
const LS_KEY = {
  SESSION: "session", // {addr, chainId, ts}
};
