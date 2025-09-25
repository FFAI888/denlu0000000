/* v1.63 首页逻辑：余额 + 价格 + 链上行情 + RONG/CRC K线 + 成交量 + 周期切换(日/周/月) + 页面日志，每秒刷新 */

function log(msg){
  const el = document.getElementById("debugLog");
  if(el){
    const t = new Date().toLocaleTimeString();
    el.innerText += `\n[${t}] ${msg}`;
    el.scrollTop = el.scrollHeight;
  }
}

// 代币和池子地址
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

// 当前周期（默认 1 分钟）
let timeframe = 1;

// —— 周期切换 —— //
function setTimeframe(tf){
  timeframe = tf;
  log(`⏱ 周期切换为: ${tf===1?"分钟":tf===60?"日":tf===60*24*7?"周":"月"}`);
}

// —— UI —— //
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
    log("🔗 Web3 Provider 初始化完成");
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
    log(`💰 余额 ${sym}: ${formatted}`);
  }catch(_){
    const el = document.getElementById(elId);
    if (el) el.innerText = "❌ 余额获取失败";
    log(`❌ 余额获取失败: ${tokenAddr}`);
  }
}

// —— 链上价格 —— //
async function priceFromPair(pairAddr, base, quote){
  try{
    const p = getProvider();
    const pair = new ethers.Contract(pairAddr, pairAbi, p);
    const [t0, t1, res] = await Promise.all([pair.token0(), pair.token1(), pair.getReserves()]);
    const t0c = new ethers.Contract(t0, erc20Abi, p);
    const t1c = new ethers.Contract(t1, erc20Abi, p);
    const [d0, d1] = await Promise.all([t0c.decimals(), t1c.decimals()]);
    const token0 = t0.toLowerCase(), token1 = t1.toLowerCase();
    const baseL = base.toLowerCase(), quoteL = quote.toLowerCase();
    let price;
    if (token0===baseL && token1===quoteL){
      price = Number(ethers.utils.formatUnits(res[1], d1)) / Number(ethers.utils.formatUnits(res[0], d0));
    } else if (token1===baseL && token0===quoteL){
      price = Number(ethers.utils.formatUnits(res[0], d0)) / Number(ethers.utils.formatUnits(res[1], d1));
    } else {
      price = Number(ethers.utils.formatUnits(res[0], d0)) / Number(ethers.utils.formatUnits(res[1], d1));
    }
    log(`📈 价格更新: ${base} 对 ${quote} = ${price}`);
    return price;
  }catch(e){
    log(`❌ 获取价格失败: ${pairAddr}`);
    throw e;
  }
}

// —— 图表工具 —— //
function createChart(containerId,height=400){
  const el = document.getElementById(containerId);
  if (!el){ log("❌ 找不到图表容器:"+containerId); return null; }
  log("📊 初始化图表容器:"+containerId);
  return LightweightCharts.createChart(el, {
    width: el.clientWidth, height: height,
    layout: { background: { color: "#fff" }, textColor: "#000" },
    grid: { vertLines: { color: "#eee" }, horzLines: { color: "#eee" } },
    timeScale: { timeVisible: true, secondsVisible: false }
  });
}

class CandleBuffer {
  constructor(storageKey){ this.key = storageKey; this.candles = this.load(); this.bucket = null; }
  load(){ try{ const t = localStorage.getItem(this.key); return t? JSON.parse(t):[]; }catch{ return []; } }
  save(){ try{ localStorage.setItem(this.key, JSON.stringify(this.candles)); }catch{} }
  update(price){
    const now = Date.now();
    const bucket = Math.floor(now/(timeframe*60000));
    if(this.bucket!==bucket){
      this.bucket = bucket;
      this.candles.push({ time: Math.floor(now/1000), open: price, high: price, low: price, close: price });
      log(`🟢 新蜡烛(${this.key}, tf=${timeframe}): ${price}`);
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

// —— RONG 图表 + 成交量 —— //
let rChart=null, rSeries=null, rBuf=null, rVolChart=null, rVolSeries=null;
function initRongChart(){
  rChart = createChart("rongChart");
  if (!rChart){ log("❌ RONG 图表初始化失败"); return; }
  rSeries = rChart.addCandlestickSeries();
  rBuf = new CandleBuffer("candles_rong_usdt");
  if(rBuf.candles.length){ rSeries.setData(rBuf.candles); }

  rVolChart = createChart("rongVolume",150);
  rVolSeries = rVolChart.addHistogramSeries({ priceFormat:{ type:"volume" } });
  log("✅ RONG 图表初始化完成 (含成交量)");
}

// —— CRC 图表 + 成交量 —— //
let cChart=null, cSeries=null, cBuf=null, cVolChart=null, cVolSeries=null;
function initCrcChart(){
  cChart = createChart("crcChart");
  if (!cChart){ log("❌ CRC 图表初始化失败"); return; }
  cSeries = cChart.addCandlestickSeries();
  cBuf = new CandleBuffer("candles_crc_usdt");
  if(cBuf.candles.length){ cSeries.setData(cBuf.candles); }

  cVolChart = createChart("crcVolume",150);
  cVolSeries = cVolChart.addHistogramSeries({ priceFormat:{ type:"volume" } });
  log("✅ CRC 图表初始化完成 (含成交量)");
}

// —— 刷新一次 —— //
async function tickOnce(){
  log("🔄 开始刷新一次...");
  try{
    const pRU = await priceFromPair(RONG_USDT_PAIR, RONGCHAIN_TOKEN, USDT);
    document.getElementById("price").innerText = `≈ ${pRU.toFixed(6)} USDT`;

    const pRC = await priceFromPair(RONG_CRC_PAIR, RONGCHAIN_TOKEN, CRC_TOKEN);
    const crcUsdt = pRU / pRC;
    document.getElementById("crcPrice").innerText = `${pRC.toFixed(6)} CRC（≈ ${crcUsdt.toFixed(6)} USDT）`;

    if(rBuf && rSeries){
      const arr = rBuf.update(pRU);
      rSeries.setData(arr);
      if(rVolSeries){
        rVolSeries.setData(arr.map(c=>({
          time:c.time,
          value:Math.abs(c.close-c.open)*1000,
          color:c.close>=c.open ? "#26a69a" : "#ef5350"
        })));
      }
    }

    if(cBuf && cSeries){
      const arr = cBuf.update(crcUsdt);
      cSeries.setData(arr);
      if(cVolSeries){
        cVolSeries.setData(arr.map(c=>({
          time:c.time,
          value:Math.abs(c.close-c.open)*1000,
          color:c.close>=c.open ? "#26a69a" : "#ef5350"
        })));
      }
    }
    log(`✅ 刷新完成 RONG=${pRU} CRC≈${crcUsdt}`);
  }catch(e){
    log("❌ tickOnce 出错:"+e.message);
  }
}

// —— 启动 —— //
(function start(){
  log("🚀 app.js v1.63 启动，每秒刷新一次");
  showWallet();
  initRongChart();
  initCrcChart();
  setInterval(tickOnce, 1000); // 1秒刷新一次
})();
