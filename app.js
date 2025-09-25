/* v1.51 首页逻辑：不减少功能，整合余额/价格/双K线/刷新选择/记忆周期 */
const RONGCHAIN_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e";
const CRC_TOKEN       = "0x5b2fe2b06e714b7bea4fd35b428077d850c48087";
const USDT            = "0x55d398326f99059ff775485246999027b3197955";
const RONG_USDT_PAIR  = "0x7f20dE20b53b8145F75F7a7Bc55CC90AEFEeb795";
const RONG_CRC_PAIR   = "0x8cDb69f2dDE96fB98FB5AfA6eB553eaB308D16a5";

const erc20Abi = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)"
];
const pairAbi = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112,uint112,uint32)"
];

let provider = null;

/* —— 页面与钱包 —— */
const ACCOUNT = localStorage.getItem("walletAddress") || null;
function showWallet(){
  const el = document.getElementById("wallet");
  if (!el) return;
  el.innerText = ACCOUNT ? ("钱包地址: " + ACCOUNT) : "钱包地址: 未登录";
}
function checkAddressValid(){
  const el = document.getElementById("addressStatus");
  if (!el) return;
  try{
    if (ACCOUNT && ethers.utils.isAddress(ACCOUNT)) el.innerText = "✅ 地址有效";
    else el.innerText = "❌ 地址无效或未登录";
  }catch{ el.innerText = "❌ 地址检测失败"; }
}
function goAdmin(){ window.location.href = "admin.html"; }

/* —— provider —— */
function getProvider(){
  if (!provider) {
    if (!window.ethereum) throw new Error("未检测到钱包环境");
    provider = new ethers.providers.Web3Provider(window.ethereum);
  }
  return provider;
}

/* —— 余额 —— */
async function fetchBalance(tokenAddr, elId){
  try{
    if (!ACCOUNT) throw new Error("未登录");
    const p = getProvider();
    const c = new ethers.Contract(tokenAddr, erc20Abi, p);
    const [dec, sym, bal] = await Promise.all([c.decimals(), c.symbol(), c.balanceOf(ACCOUNT)]);
    const formatted = ethers.utils.formatUnits(bal, dec);
    const el = document.getElementById(elId);
    if (el) el.innerText = `${formatted} ${sym}`;
  }catch(e){
    const el = document.getElementById(elId);
    if (el) el.innerText = "❌ 余额获取失败";
  }
}

/* —— 价格 —— */
async function priceFromPair(pairAddr, base, quote){
  const p = getProvider();
  const pair = new ethers.Contract(pairAddr, pairAbi, p);
  const [t0, t1, res] = await Promise.all([pair.token0(), pair.token1(), pair.getReserves()]);
  const t0c = new ethers.Contract(t0, erc20Abi, p);
  const t1c = new ethers.Contract(t1, erc20Abi, p);
  const [d0, d1] = await Promise.all([t0c.decimals(), t1c.decimals()]);
  const token0 = t0.toLowerCase(), token1 = t1.toLowerCase();
  const baseL = base.toLowerCase(), quoteL = quote.toLowerCase();
  if (token0===baseL && token1===quoteL){
    return Number(ethers.utils.formatUnits(res[1], d1)) / Number(ethers.utils.formatUnits(res[0], d0));
  } else if (token1===baseL && token0===quoteL){
    return Number(ethers.utils.formatUnits(res[0], d0)) / Number(ethers.utils.formatUnits(res[1], d1));
  }
  // 若顺序不匹配，也尝试两边颠倒（容错）
  return Number(ethers.utils.formatUnits(res[0], d0)) / Number(ethers.utils.formatUnits(res[1], d1));
}

async function updateSpotPrices(){
  try{
    const pRU = await priceFromPair(RONG_USDT_PAIR, RONGCHAIN_TOKEN, USDT);
    const priceEl = document.getElementById("price");
    if (priceEl) priceEl.innerText = `≈ ${pRU.toFixed(6)} USDT`;
  }catch(_){
    const priceEl = document.getElementById("price"); if (priceEl) priceEl.innerText = "❌ 获取失败";
  }
  try{
    const pRU = await priceFromPair(RONG_USDT_PAIR, RONGCHAIN_TOKEN, USDT);
    const pRC = await priceFromPair(RONG_CRC_PAIR, RONGCHAIN_TOKEN, CRC_TOKEN);
    const crcUsdt = pRU / pRC;
    const el = document.getElementById("crcPrice");
    if (el) el.innerText = `≈ ${pRC.toFixed(6)} CRC（推导≈ ${crcUsdt.toFixed(6)} USDT/CRC）`;
  }catch(_){
    const el = document.getElementById("crcPrice"); if (el) el.innerText = "❌ 获取失败";
  }
}

/* —— 图表通用 —— */
function createChart(containerId){
  const el = document.getElementById(containerId);
  if (!el) return null;
  return LightweightCharts.createChart(el, { width: el.clientWidth, height: 400 });
}
function markActive(groupId, activeId){
  document.querySelectorAll(`#${groupId} button`).forEach(b=>b.classList.remove("active"));
  const el = document.getElementById(activeId); if (el) el.classList.add("active");
}

/* —— RONG K线 —— */
let rChart=null, rSeries=null, rCandles=[], rBucket=null, rTF=parseInt(localStorage.getItem("rong_tf")||1);
function initRongChart(){
  rChart = createChart("rongChart");
  if (!rChart) return;
  rSeries = rChart.addCandlestickSeries();
  markActive("rfBtns", "rbtn"+rTF);
  window.addEventListener('resize', ()=>{ rChart.applyOptions({ width: document.getElementById('rongChart').clientWidth }); });
}
function switchRongTF(min){ rTF=min; localStorage.setItem("rong_tf", min); rCandles=[]; rBucket=null; if(rSeries) rSeries.setData([]); markActive("rfBtns","rbtn"+min); }
async function updateRongCandle(){
  try{
    const p = await priceFromPair(RONG_USDT_PAIR, RONGCHAIN_TOKEN, USDT);
    const now=Date.now(), bucket=Math.floor(now/(rTF*60000));
    if(rBucket!==bucket){ rBucket=bucket; rCandles.push({ time:Math.floor(now/1000), open:p, high:p, low:p, close:p }); }
    else{ const c=rCandles[rCandles.length-1]; c.high=Math.max(c.high,p); c.low=Math.min(c.low,p); c.close=p; }
    if (rSeries) rSeries.setData(rCandles);
  }catch(e){ /* 静默失败，避免频繁弹错 */ }
}

/* —— CRC K线（推导 USDT） —— */
let cChart=null, cSeries=null, cCandles=[], cBucket=null, cTF=parseInt(localStorage.getItem("crc_tf")||1);
function initCrcChart(){
  cChart = createChart("crcChart");
  if (!cChart) return;
  cSeries = cChart.addCandlestickSeries();
  markActive("cfBtns", "cbtn"+cTF);
  window.addEventListener('resize', ()=>{ cChart.applyOptions({ width: document.getElementById('crcChart').clientWidth }); });
}
function switchCrcTF(min){ cTF=min; localStorage.setItem("crc_tf", min); cCandles=[]; cBucket=null; if(cSeries) cSeries.setData([]); markActive("cfBtns","cbtn"+min); }
async function updateCrcCandle(){
  try{
    const pRU = await priceFromPair(RONG_USDT_PAIR, RONGCHAIN_TOKEN, USDT);
    const pRC = await priceFromPair(RONG_CRC_PAIR, RONGCHAIN_TOKEN, CRC_TOKEN);
    const p = pRU / pRC;
    const now=Date.now(), bucket=Math.floor(now/(cTF*60000));
    if(cBucket!==bucket){ cBucket=bucket; cCandles.push({ time:Math.floor(now/1000), open:p, high:p, low:p, close:p }); }
    else{ const c=cCandles[cCandles.length-1]; c.high=Math.max(c.high,p); c.low=Math.min(c.low,p); c.close=p; }
    if (cSeries) cSeries.setData(cCandles);
  }catch(e){ /* 静默失败 */ }
}

/* —— 刷新控制 —— */
let refreshInterval = parseInt(localStorage.getItem("refresh_ms") || 1000);
let refreshTimer = null;
function setRefresh(ms){
  refreshInterval = ms;
  localStorage.setItem("refresh_ms", ms);
  const cur = document.getElementById("curInterval"); if (cur) cur.innerText = (ms/1000)+" 秒";
  document.querySelectorAll("#refreshBtns button").forEach(b=>b.classList.remove("active"));
  const btn = document.getElementById("r"+ms); if (btn) btn.classList.add("active");
  restartTimers();
}
function restartTimers(){
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(()=>{
    showWallet();
    checkAddressValid();
    fetchBalance(RONGCHAIN_TOKEN, "balance");
    fetchBalance(CRC_TOKEN, "crcBalance");
    updateSpotPrices();
    updateRongCandle();
    updateCrcCandle();
  }, refreshInterval);
}

/* —— 启动 —— */
(function start(){
  showWallet();
  checkAddressValid();
  // 初始化图表
  initRongChart(); initCrcChart();
  // 恢复刷新间隔
  setRefresh(refreshInterval);
})();
