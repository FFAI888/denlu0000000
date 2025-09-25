/* v1.58 调试版：增加 console.log()，排查 K 线图不显示 */

console.log("✅ app.js v1.58 加载成功");

function createChart(containerId,height=400){
  const el = document.getElementById(containerId);
  if (!el){ console.error("❌ 找不到图表容器:",containerId); return null; }
  console.log("📊 初始化图表容器:",containerId);
  return LightweightCharts.createChart(el, {
    width: el.clientWidth, height: height,
    layout: { background: { color: "#fff" }, textColor: "#000" },
    grid: { vertLines: { color: "#eee" }, horzLines: { color: "#eee" } },
    timeScale: { timeVisible: true, secondsVisible: false }
  });
}

class CandleBuffer {
  constructor(storageKey){ 
    this.key = storageKey; 
    this.candles = this.load(); 
    this.bucket = null; 
    console.log("📦 初始化 CandleBuffer:",storageKey,"历史长度:",this.candles.length);
  }
  load(){ try{ const t = localStorage.getItem(this.key); return t? JSON.parse(t):[]; }catch{ return []; } }
  save(){ try{ localStorage.setItem(this.key, JSON.stringify(this.candles)); }catch{} }
  update(price, tfMin){
    const now = Date.now();
    const bucket = Math.floor(now/(tfMin*60000));
    if(this.bucket!==bucket){
      this.bucket = bucket;
      this.candles.push({ time: Math.floor(now/1000), open: price, high: price, low: price, close: price });
      console.log("🟢 新蜡烛:",this.key,"价格=",price,"时间框=",tfMin);
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

// —— 图表实例 —— //
let rChart=null, rSeries=null, rBuf=null;
let cChart=null, cSeries=null, cBuf=null;

function initRongChart(){
  rChart = createChart("rongChart");
  if (!rChart){ console.error("❌ RONG 图表初始化失败"); return; }
  rSeries = rChart.addCandlestickSeries();
  rBuf = new CandleBuffer("candles_rong_usdt");
  if(rBuf.candles.length){
    rSeries.setData(rBuf.candles);
    console.log("📊 RONG 图表加载历史数据:",rBuf.candles.length);
  }
}

function initCrcChart(){
  cChart = createChart("crcChart");
  if (!cChart){ console.error("❌ CRC 图表初始化失败"); return; }
  cSeries = cChart.addCandlestickSeries();
  cBuf = new CandleBuffer("candles_crc_usdt");
  if(cBuf.candles.length){
    cSeries.setData(cBuf.candles);
    console.log("📊 CRC 图表加载历史数据:",cBuf.candles.length);
  }
}

// —— 刷新逻辑（示例，保留你原来的 fetch 逻辑） —— //
async function tickOnce(){
  try{
    console.log("🔄 tickOnce 开始刷新...");
    const priceRong = Math.random()*0.01+0.0013; // 假数据示例
    const priceCrc  = Math.random()*0.0001+0.0003;

    if(rBuf && rSeries){
      const arr = rBuf.update(priceRong,1);
      rSeries.setData(arr);
      console.log("✅ RONG 刷新:",priceRong);
    }
    if(cBuf && cSeries){
      const arr = cBuf.update(priceCrc,1);
      cSeries.setData(arr);
      console.log("✅ CRC 刷新:",priceCrc);
    }
  }catch(e){
    console.error("❌ tickOnce 出错:",e);
  }
}

// —— 启动 —— //
(function start(){
  console.log("🚀 初始化开始");
  initRongChart();
  initCrcChart();
  setInterval(tickOnce, 3000); // 每3秒刷新一次
})();
