// v1.57 app.js
// 合并所有功能：钱包显示、余额、链上价格（含 decimals 归一化）、24h 涨跌幅、链上本地K线、Dex主题切换、刷新间隔

// === RPC 提供方（只读） ===
const providerUrl = "https://bsc-dataseed.binance.org/";
const provider = new ethers.providers.JsonRpcProvider(providerUrl);

// === 常量：代币 & 池子（BSC） ===
const RONGCHAIN_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e"; // RONG
const CRC_TOKEN       = "0x5b2fe2b06e714b7bea4fd35b428077d850c48087"; // CRC
const USDT            = "0x55d398326f99059fF775485246999027B3197955"; // USDT

const RONG_USDT_PAIR  = "0x7f20dE20b53b8145F75F7a7Bc55CC90AEFEeb795";
const RONG_CRC_PAIR   = "0x8cDb69f2dDE96fB98FB5AfA6eB553eaB308D16a5";

// === ABI ===
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

// === 全局状态 ===
let userAddr = null;
let refreshTimer = null;
let refreshInterval = parseInt(localStorage.getItem("refresh_ms") || "1000");

// 24h 涨跌幅基准
let lastRongPrice = null, lastCrcPrice = null;

// —— 钱包显示 —— //
function showWallet(){
  const addr = localStorage.getItem("walletAddress");
  if(addr){
    userAddr = addr;
    const w = document.getElementById("wallet");
    if(w) w.innerText = "钱包地址: " + addr;
    const s = document.getElementById("addressStatus");
    if(s) s.innerText = "✅ 已连接";
  }else{
    const w = document.getElementById("wallet");
    if(w) w.innerText = "未连接";
    const s = document.getElementById("addressStatus");
    if(s) s.innerText = "❌ 未连接";
  }
}

// —— 余额 —— //
async function fetchBalance(token, elemId){
  if(!userAddr) return;
  try{
    const c = new ethers.Contract(token, ERC20_ABI, provider);
    const [dec, sym, raw] = await Promise.all([c.decimals(), c.symbol(), c.balanceOf(userAddr)]);
    const val = Number(ethers.utils.formatUnits(raw, dec));
    const el = document.getElementById(elemId);
    if(el) el.innerText = `${val.toFixed(4)} ${sym}`;
  }catch(e){
    const el = document.getElementById(elemId);
    if(el) el.innerText = "余额获取失败";
  }
}

// —— 链上价格（恢复 decimals 归一化） —— //
async function priceFromPair(pairAddr, baseToken, quoteToken){
  const pair = new ethers.Contract(pairAddr, PAIR_ABI, provider);
  const [t0, t1] = await Promise.all([pair.token0(), pair.token1()]);
  const [r0, r1] = await pair.getReserves();

  // 读取 token0 / token1 的 decimals
  const t0c = new ethers.Contract(t0, ERC20_ABI, provider);
  const t1c = new ethers.Contract(t1, ERC20_ABI, provider);
  const [d0, d1] = await Promise.all([t0c.decimals(), t1c.decimals()]);

  const token0 = t0.toLowerCase();
  const token1 = t1.toLowerCase();
  const baseL  = baseToken.toLowerCase();
  const quoteL = quoteToken.toLowerCase();

  // 归一化储备为“人类可读”
  const f0 = Number(ethers.utils.formatUnits(r0, d0));
  const f1 = Number(ethers.utils.formatUnits(r1, d1));

  // 价格：1 base = ? quote
  if (token0 === baseL && token1 === quoteL){
    return f1 / f0;
  } else if (token1 === baseL && token0 === quoteL){
    return f0 / f1;
  } else {
    // 顺序异常时仍按 0/1 返回比值（避免完全中断）
    return f1 / f0;
  }
}

// —— 涨跌幅 —— //
function calcChange(cur, last){
  if(last === null || last === 0) return "计算中...";
  const pct = ((cur - last) / last) * 100;
  return (pct >= 0 ? "▲ " : "▼ ") + pct.toFixed(2) + "%";
}

// —— 本地 K 线缓冲 —— //
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
    this.save(); return this.candles;
  }
}

// —— 本地图表 —— //
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

// RONG 本地图
let rChart=null, rSeries=null, rBuf=null, rTF=parseInt(localStorage.getItem("rong_tf")||"1");
function initRongChart(){
  rChart = createChart("rongChart");
  if(!rChart) return;
  rSeries = rChart.addCandlestickSeries();
  rBuf = new CandleBuffer("candles_rong_usdt");
  if(rBuf.candles.length) rSeries.setData(rBuf.candles);
  markActive("rfBtns","rbtn"+rTF);
  window.addEventListener('resize', ()=>{ rChart.applyOptions({ width: document.getElementById('rongChart').clientWidth }); });
}
function switchRongTF(min){ rTF=min; localStorage.setItem("rong_tf",min); if(rBuf&&rSeries) rSeries.setData(rBuf.candles); markActive("rfBtns","rbtn"+min); }

// CRC 本地图
let cChart=null, cSeries=null, cBuf=null, cTF=parseInt(localStorage.getItem("crc_tf")||"1");
function initCrcChart(){
  cChart = createChart("crcChart");
  if(!cChart) return;
  cSeries = cChart.addCandlestickSeries();
  cBuf = new CandleBuffer("candles_crc_usdt");
  if(cBuf.candles.length) cSeries.setData(cBuf.candles);
  markActive("cfBtns","cbtn"+cTF);
  window.addEventListener('resize', ()=>{ cChart.applyOptions({ width: document.getElementById('crcChart').clientWidth }); });
}
function switchCrcTF(min){ cTF=min; localStorage.setItem("crc_tf",min); if(cBuf&&cSeries) cSeries.setData(cBuf.candles); markActive("cfBtns","cbtn"+min); }

// 按钮高亮
function markActive(groupId, activeId){
  document.querySelectorAll("#"+groupId+" button").forEach(b=>b.classList.remove("active"));
  const el = document.getElementById(activeId); if(el) el.classList.add("active");
}

// —— Dex 主题切换（同时作用两张 iframe） —— //
function switchTheme(theme){
  const baseR = "https://dexscreener.com/bsc/0x7f20dE20b53b8145F75F7a7Bc55CC90AEFEeb795";
  const baseC = "https://dexscreener.com/bsc/0x8cDb69f2dDE96fB98FB5AfA6eB553eaB308D16a5";
  const q = `?embed=1&theme=${theme}&trades=0&info=0`;
  const f1 = document.getElementById("dexRongUsdt"); if(f1) f1.src = baseR + q;
  const f2 = document.getElementById("dexRongCrc");  if(f2) f2.src = baseC + q;
  document.querySelectorAll(".theme-switch button").forEach(b=>b.classList.remove("active"));
  const id = "theme" + theme.charAt(0).toUpperCase() + theme.slice(1);
  const b = document.getElementById(id); if(b) b.classList.add("active");
}

// —— 刷新控制 —— //
function setRefresh(ms){
  refreshInterval = ms; localStorage.setItem("refresh_ms", String(ms));
  const el = document.getElementById("curInterval"); if(el) el.innerText = (ms/1000)+" 秒";
  document.querySelectorAll("#refreshBtns button").forEach(b=>b.classList.remove("active"));
  const btn = document.getElementById("r"+ms); if(btn) btn.classList.add("active");
  restartTimers();
}
function restartTimers(){ if(refreshTimer) clearInterval(refreshTimer); refreshTimer = setInterval(()=>{ tickOnce(); }, refreshInterval); }

// —— 一次刷新 —— //
async function tickOnce(){
  showWallet();
  // 余额
  fetchBalance(RONGCHAIN_TOKEN, "balance");
  fetchBalance(CRC_TOKEN,  "crcBalance");

  try{
    // RONG/USDT
    const pRU = await priceFromPair(RONG_USDT_PAIR, RONGCHAIN_TOKEN, USDT);
    const pe = document.getElementById("price"); if(pe) pe.innerText = `≈ ${pRU.toFixed(6)} USDT`;

    // RONG/CRC & CRC≈USDT
    const pRC = await priceFromPair(RONG_CRC_PAIR, RONGCHAIN_TOKEN, CRC_TOKEN);
    const crcUsdt = pRU / pRC;
    const ce = document.getElementById("crcPrice"); if(ce) ce.innerText = `${pRC.toFixed(6)} CRC（≈ ${crcUsdt.toFixed(6)} USDT）`;

    // 24h涨跌幅（以首次价格为基准模拟）
    const rc = document.getElementById("rongChange");
    const cc = document.getElementById("crcChange");
    if(lastRongPrice===null) lastRongPrice = pRU;
    if(lastCrcPrice===null)  lastCrcPrice  = crcUsdt;
    if(rc) rc.innerText = calcChange(pRU, lastRongPrice);
    if(cc) cc.innerText = calcChange(crcUsdt, lastCrcPrice);

    // 本地 K 线更新
    if(rBuf && rSeries){ rSeries.setData(rBuf.update(pRU, rTF)); }
    if(cBuf && cSeries){ cSeries.setData(cBuf.update(crcUsdt, cTF)); }
  }catch(e){
    console.error("tickOnce 出错:", e);
  }
}

// —— 导航 —— //
function goAdmin(){ window.location.href = "admin.html"; }

// —— 启动 —— //
(function start(){
  showWallet();
  initRongChart(); initCrcChart();
  setRefresh(refreshInterval);
  tickOnce();
})();
