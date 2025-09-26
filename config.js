// v9.8 config.js

const SESSION_TIMEOUT = 30 * 60 * 1000; 
const SUPPORTED_CHAIN_HEX = "0x38";
const SUPPORTED_CHAIN_DEC = 56;

const WHITELIST_ADDR = "0x8b32872842C76DA95aeB25d27dE2F16fa1979bE5";

const ABI = [
  "function isWhitelisted(address) view returns (bool)",
  "function owner() view returns (address)",
  "function transferOwnership(address newOwner) external",
  "function setWhitelisted(address,bool) external",
  "function getWhitelist() view returns(address[])"
];

const TOKENS = {
  RONG: "0x0337a015467af6605c4262d9f02a3dcd8b576f7e",
  USDT: "0x55d398326f99059ff775485246999027b3197955",
  CRC:  "0x5b2fe2b06e714b7bea4fd35b428077d850c48087"
};

const PAIRS = {
  RONG_USDT: "0x7f20dE20b53b8145F75F7a7Bc55CC90AEFEeb795",
  RONG_CRC:  "0x8cDb69f2dDE96fB98FB5AfA6eB553eaB308D16a5"
};

const PRICE_REFRESH_MS = 1000;
const STATE_REFRESH_MS = 5000;

const KLINE_SUPPORTED = ["1m","1h","1d"];
const KLINE_DEFAULT_INTERVAL = "1m";

const PAIR_ABI = [
  "function getReserves() view returns (uint112,uint112,uint32)",
  "function token0() view returns (address)",
  "function token1() view returns (address)"
];

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

// GraphQL 端点
const PANCAKE_GQL = "https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2";

const toastDuration = 3000;
