/* v1.54 首页逻辑：余额 + 价格 + 链上实时双K线 + 刷新间隔 + 本地缓存 */

// 代币与池子（BSC）
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
const ACCOUNT = localStorage.getItem("walletAddress") || null;

// —— UI 基础 —— //
function showWallet(){
  const el = document.getElementById("wallet");
  if (el) el.innerText = ACCOUNT ? ("钱包地址: " + ACCOUNT) : "钱包地址: 未登录";
  const st = document.getElementById("addressStatus");
  if (st){
    try{
      st.innerText = (ACCOUNT && ethers.utils.isAddress(ACCOUNT)) ? "✅ 地址有效" : "❌ 地址无效或未登录";
    }catch{ st.innerText = "❌ 地址检测失败"; }
  }
}
function goAdmin(){ window.location.href = "admin.html"; }

function getProvider(){
  if (!provider){
    if (!window.ethereum) throw new Error("未检测到钱包环境");
    provider = new ethers.providers.Web3Provider(window.ethereum);
  }
  return provider;
}

// —— 余额 —— //
async function fetchBalance(tokenAddr, elId){
  try{
    if (!ACCOUNT) throw new Error("未登录");
    const p = getProvider();
    const c = new ethers.Contract(tokenAddr, erc20Abi, p);
    const [dec, sym, bal] = await Promise.all([c.decimals(), c.symbol(), c.balanceOf(ACCOUNT)]);
    const formatted = ethers.utils.formatUnits(bal, dec);
    const el = document.getElementById(elId);
    if (el) el.innerText = `${formatted} ${sym}`;
  }catch(_){
    const el = document.getElementById(elId);
    if (el) el.innerText = "❌ 余额获取失败";
  }
}

// —— 链上价格 —— //
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
  return Number(ethers.utils.formatUnits(res[0], d0)) / Number(ethers.utils.formatUnits(res[1], d1));
}

// —— K 线图 —— //
function createChart(containerId){
  const el = document.getElementById(containerId);
  if (!el) return null;
  return LightweightCharts.createChart(el, {
    width: el.clientWidth, height: 400,
    layout: { background: { color: "#fff" }, textColor: "#000" },
    grid: { vertLines: { color: "#eee" }, horzLines: { color: "#eee" } },
    timeScale: { timeVisible: true, secondsVisible: false }
  });
}

class CandleBuffer {
  constructor(storageKey){ this.key = storageKey; this.candles = this.load(); this.bucket = null; }
  load(){ try{ const t = localStorage.getItem(this.key); return t? JSON.parse(t):[]; }catch{ return []; } }
  save(){ try{ localStorage.setItem(this.key, JSON.stringify(this.candles)); }catch{} }
  update(price, tfMin){
    const now = Date.now();
    const bucket = Math.floor(now/(tfMin*60000));
    if(this.bucket!==bucket){
      this.bucket = bucket;
      this.candles.push({ time: Math.floor(now/1000), open: price, high: price, low: price, close: price });
    }else{
      const c = this.candles[this.candles.length-1];
      c.high = Math.max(c.high, price);
      c.low  = Math.min(c.low,  price);
      c.close= price;
    }
    if(this.candles.length>2000) this.candles = this.candles.slice(-1200);
    this.save();
    return this.candles;
  }
}

// RONG 图表
let rChart=null, rSeries=null, rBuf=null, rTF=parseInt(localStorage.getItem("rong_tf")||1);
function initRongChart(){
  rChart = createChart("rongChart");
  if (!rChart) return;
  rSeries = rChart.addCandlestickSeries();
  rBuf = new CandleBuffer("candles_rong_usdt");
  if(rBuf.candles.length) rSeries.setData(rBuf.candles);
  markActive("rfBtns","rbtn"+rTF);
  window.addEventListener('resize', ()=>{ rChart.applyOptions({ width: document.getElementById('rongChart').clientWidth }); });
}
function switchRongTF(min){ rTF=min; localStorage.setItem("rong_tf",min); rSeries.setData(rBuf.candles); markActive("rfBtns","rbtn"+min); }

// CRC 图表
let cChart=null, cSeries=null, cBuf=null, cTF=parseInt(localStorage.getItem("crc_tf")||1);
function initCrcChart(){
  cChart = createChart("crcChart");
  if (!cChart) return;
  cSeries = cChart.addCandlestickSeries();
  cBuf = new CandleBuffer("candles_crc_usdt");
  if(cBuf.candles.length) cSeries.setData(cBuf.candles);
  markActive("cfBtns","cbtn"+cTF);
  window.addEventListener('resize', ()=>{ cChart.applyOptions({ width: document.getElementById('crcChart').clientWidth }); });
}
function switchCrcTF(min){ cTF=min; localStorage.setItem("crc_tf",min); cSeries.setData(cBuf.candles); markActive("cfBtns","cbtn"+min); }

// 高亮按钮
function markActive(groupId,activeId){
  document.querySelectorAll("#"+groupId+" button").forEach(b=>b.classList.remove("active"));
  const el = document.getElementById(activeId); if(el) el.classList.add("active");
}

// —— 刷新控制 —— //
let refreshInterval = parseInt(localStorage.getItem("refresh_ms")||1000);
let refreshTimer = null;

function setRefresh(ms){
  refreshInterval = ms;
  localStorage.setItem("refresh_ms",ms);
  const el = document.getElementById("curInterval"); if(el) el.innerText = (ms/1000)+" 秒";
  document.querySelectorAll("#refreshBtns button").forEach(b=>b.classList.remove("active"));
  const btn = document.getElementById("r"+ms); if(btn) btn.classList.add("active");
  restartTimers();
}

// —— 每次刷新 —— //
async function tickOnce(){
  showWallet();
  fetchBalance(RONGCHAIN_TOKEN, "balance");
  fetchBalance(CRC_TOKEN,  "crcBalance");

  try{
    // RONG/USDT
    const pRU = await priceFromPair(RONG_USDT_PAIR, RONGCHAIN_TOKEN, USDT);
    document.getElementById("price").innerText = `≈ ${pRU.toFixed(6)} USDT`;

    // RONG/CRC 与 CRC≈USDT 推导
    const pRC = await priceFromPair(RONG_CRC_PAIR, RONGCHAIN_TOKEN, CRC_TOKEN);
    const crcUsdt = pRU / pRC;
    document.getElementById("crcPrice").innerText = `${pRC.toFixed(6)} CRC（≈ ${crcUsdt.toFixed(6)} USDT）`;

    // 更新 K 线（RONG）
    if(rBuf && rSeries){ const arr = rBuf.update(pRU, rTF); rSeries.setData(arr); }

    // 更新 K 线（CRC）
    if(cBuf && cSeries){ const arr = cBuf.update(crcUsdt, cTF); cSeries.setData(arr); }
  }catch(e){
    console.error("价格或行情更新失败", e);
  }
}

function restartTimers(){
  if(refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(()=>{ tickOnce(); }, refreshInterval);
}

// —— 启动 —— //
(function start(){
  showWallet();
  initRongChart(); initCrcChart();
  setRefresh(refreshInterval);
  tickOnce();
})();
