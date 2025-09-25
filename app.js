// v1.59 app.js
// 保留功能：连接钱包、余额、价格、涨跌幅、刷新、Dex 图表主题切换、管理员跳转

// === 常量配置 ===
const providerUrl = "https://bsc-dataseed.binance.org/";
const provider = new ethers.providers.JsonRpcProvider(providerUrl);

const RONGCHAIN_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e";
const CRC_TOKEN       = "0x5b2fe2b06e714b7bea4fd35b428077d850c48087";
const USDT            = "0x55d398326f99059fF775485246999027B3197955";

const RONG_USDT_PAIR  = "0x7f20dE20b53b8145F75F7a7Bc55CC90AEFEeb795";
const RONG_CRC_PAIR   = "0x8cDb69f2dDE96fB98FB5AfA6eB553eaB308D16a5";

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint)"
];
const PAIR_ABI = [
  "function getReserves() view returns (uint112 reserve0,uint112 reserve1,uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)"
];

// === 全局变量 ===
let userAddr = null;
let refreshTimer = null;
let refreshInterval = 1000;

let lastRongPrice = null;
let lastCrcPrice = null;

// === 钱包显示 ===
async function showWallet(){
  const addr = localStorage.getItem("walletAddress");
  if(addr){
    userAddr = addr;
    document.getElementById("wallet").innerText = "钱包地址: " + addr;
    document.getElementById("addressStatus").innerText = "✅ 已连接";
  }else{
    document.getElementById("wallet").innerText = "未连接";
    document.getElementById("addressStatus").innerText = "❌ 未连接";
  }
}

// === 余额获取 ===
async function fetchBalance(token, elemId){
  if(!userAddr) return;
  try{
    const c = new ethers.Contract(token, ERC20_ABI, provider);
    const [decimals, symbol, raw] = await Promise.all([
      c.decimals(), c.symbol(), c.balanceOf(userAddr)
    ]);
    const bal = Number(ethers.utils.formatUnits(raw, decimals));
    document.getElementById(elemId).innerText = `${bal.toFixed(4)} ${symbol}`;
  }catch(e){
    document.getElementById(elemId).innerText = "余额获取失败";
  }
}

// === 价格计算 ===
async function priceFromPair(pairAddr, tokenTarget, tokenOther){
  const pair = new ethers.Contract(pairAddr, PAIR_ABI, provider);
  const [t0, t1] = await Promise.all([pair.token0(), pair.token1()]);
  const [r0, r1] = await pair.getReserves();
  if(t0.toLowerCase() === tokenTarget.toLowerCase()){
    return Number(r1) / Number(r0);
  }else if(t1.toLowerCase() === tokenTarget.toLowerCase()){
    return Number(r0) / Number(r1);
  }else{
    throw new Error("Pair 不匹配");
  }
}

// === 涨跌幅计算 ===
function calcChange(cur, last){
  if(last === null) return "计算中...";
  const diff = ((cur - last) / last) * 100;
  return (diff >= 0 ? "▲ " : "▼ ") + diff.toFixed(2) + "%";
}

// === 刷新 ===
async function tickOnce(){
  showWallet();
  fetchBalance(RONGCHAIN_TOKEN, "balance");
  fetchBalance(CRC_TOKEN, "crcBalance");

  try{
    const rongUsdt = await priceFromPair(RONG_USDT_PAIR, RONGCHAIN_TOKEN, USDT);
    document.getElementById("price").innerText = `≈ ${rongUsdt.toFixed(6)} USDT`;

    const rongCrc = await priceFromPair(RONG_CRC_PAIR, RONGCHAIN_TOKEN, CRC_TOKEN);
    const crcUsdt = rongUsdt / rongCrc;
    document.getElementById("crcPrice").innerText =
      `${rongCrc.toFixed(6)} CRC（≈ ${crcUsdt.toFixed(6)} USDT）`;

    if(!lastRongPrice) lastRongPrice = rongUsdt;
    if(!lastCrcPrice) lastCrcPrice = crcUsdt;
    document.getElementById("rongChange").innerText = calcChange(rongUsdt, lastRongPrice);
    document.getElementById("crcChange").innerText = calcChange(crcUsdt, lastCrcPrice);
  }catch(e){
    console.error("价格或涨跌幅计算失败", e);
  }
}

function setRefresh(ms){
  refreshInterval = ms;
  if(refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(tickOnce, ms);
  document.getElementById("curInterval").innerText = `${ms/1000} 秒`;
  [...document.querySelectorAll("#refreshBtns button")].forEach(b=>b.classList.remove("active"));
  document.getElementById("r"+ms).classList.add("active");
}

// === 主题切换 ===
function switchTheme(theme){
  const frameUsdt = document.getElementById("dexRongUsdt");
  const frameCrc = document.getElementById("dexRongCrc");
  if(frameUsdt){
    frameUsdt.src = `https://dexscreener.com/bsc/${RONG_USDT_PAIR}?embed=1&theme=${theme}&trades=0&info=0`;
  }
  if(frameCrc){
    frameCrc.src = `https://dexscreener.com/bsc/${RONG_CRC_PAIR}?embed=1&theme=${theme}&trades=0&info=0`;
  }
  document.querySelectorAll(".theme-switch button").forEach(b=>b.classList.remove("active"));
  document.getElementById("theme"+theme.charAt(0).toUpperCase()+theme.slice(1)).classList.add("active");
}

function goAdmin(){ window.location.href="admin.html"; }

// === 启动 ===
window.onload = ()=>{
  showWallet();
  setRefresh(refreshInterval);
  tickOnce();
};
