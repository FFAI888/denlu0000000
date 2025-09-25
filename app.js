// ===== 配置 =====
const RONGCHAIN_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e";
const CRC_TOKEN       = "0x5b2fe2b06e714b7bea4fd35b428077d850c48087";
const USDT            = "0x55d398326f99059ff775485246999027b3197955";
const RONG_USDT_PAIR  = "0x7f20dE20b53b8145F75F7a7Bc55CC90AEFEeb795";
const RONG_CRC_PAIR   = "0x8cDb69f2dDE96fB98FB5AfA6eB553eaB308D16a5";

const erc20Abi = ["function decimals() view returns (uint8)"];
const pairAbi = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112,uint112,uint32)"
];

const provider = new ethers.providers.Web3Provider(window.ethereum);

async function priceFromPair(pairAddr, base, quote){
  const pair = new ethers.Contract(pairAddr, pairAbi, provider);
  const [t0,t1,res] = await Promise.all([pair.token0(), pair.token1(), pair.getReserves()]);
  const t0c = new ethers.Contract(t0, erc20Abi, provider);
  const t1c = new ethers.Contract(t1, erc20Abi, provider);
  const [d0,d1] = await Promise.all([t0c.decimals(), t1c.decimals()]);
  if(t0.toLowerCase()===base.toLowerCase() && t1.toLowerCase()===quote.toLowerCase()){
    return Number(ethers.utils.formatUnits(res[1], d1)) / Number(ethers.utils.formatUnits(res[0], d0));
  } else {
    return Number(ethers.utils.formatUnits(res[0], d0)) / Number(ethers.utils.formatUnits(res[1], d1));
  }
}

// ===== 更新价格 =====
async function updatePrices(){
  try{
    const pRongUsdt = await priceFromPair(RONG_USDT_PAIR, RONGCHAIN_TOKEN, USDT);
    document.getElementById("price").innerText = pRongUsdt.toFixed(6)+" USDT";
    const pRongCrc = await priceFromPair(RONG_CRC_PAIR, RONGCHAIN_TOKEN, CRC_TOKEN);
    const pCrcUsdt = pRongUsdt / pRongCrc;
    document.getElementById("crcPrice").innerText = pRongCrc.toFixed(6)+" CRC (≈ "+pCrcUsdt.toFixed(6)+" USDT)";
  }catch(e){ console.log("价格失败", e); }
}

// ===== 图表函数 =====
function createChart(containerId){
  return LightweightCharts.createChart(document.getElementById(containerId), {width:document.getElementById(containerId).clientWidth, height:400});
}

// RONG 图表
let rChart=createChart("rongChart"), rSeries=rChart.addCandlestickSeries(), rCandles=[], rBucket=null, rTF=parseInt(localStorage.getItem("rong_tf")||1);
function switchRongTF(min){
  rTF=min; localStorage.setItem("rong_tf",min);
  rCandles=[]; rSeries.setData([]); markActive("rfBtns","rbtn"+min);
}
async function updateRongCandle(){
  try{
    const p = await priceFromPair(RONG_USDT_PAIR, RONGCHAIN_TOKEN, USDT);
    const now=Date.now(), bucket=Math.floor(now/(rTF*60000));
    if(rBucket!==bucket){ rBucket=bucket; rCandles.push({time:Math.floor(now/1000),open:p,high:p,low:p,close:p}); }
    else{ let c=rCandles[rCandles.length-1]; c.high=Math.max(c.high,p); c.low=Math.min(c.low,p); c.close=p; }
    rSeries.setData(rCandles);
  }catch(e){}
}

// CRC 图表
let cChart=createChart("crcChart"), cSeries=cChart.addCandlestickSeries(), cCandles=[], cBucket=null, cTF=parseInt(localStorage.getItem("crc_tf")||1);
function switchCrcTF(min){
  cTF=min; localStorage.setItem("crc_tf",min);
  cCandles=[]; cSeries.setData([]); markActive("cfBtns","cbtn"+min);
}
async function updateCrcCandle(){
  try{
    const pRongUsdt = await priceFromPair(RONG_USDT_PAIR, RONGCHAIN_TOKEN, USDT);
    const pRongCrc  = await priceFromPair(RONG_CRC_PAIR, RONGCHAIN_TOKEN, CRC_TOKEN);
    const p = pRongUsdt / pRongCrc; // CRC/USDT
    const now=Date.now(), bucket=Math.floor(now/(cTF*60000));
    if(cBucket!==bucket){ cBucket=bucket; cCandles.push({time:Math.floor(now/1000),open:p,high:p,low:p,close:p}); }
    else{ let c=cCandles[cCandles.length-1]; c.high=Math.max(c.high,p); c.low=Math.min(c.low,p); c.close=p; }
    cSeries.setData(cCandles);
  }catch(e){}
}

function markActive(groupId,activeId){
  document.querySelectorAll("#"+groupId+" button").forEach(b=>b.classList.remove("active"));
  document.getElementById(activeId).classList.add("active");
}

// ===== 刷新控制 =====
let refreshInterval = parseInt(localStorage.getItem("refresh_ms")||1000);
let refreshTimer;

function setRefresh(ms){
  refreshInterval = ms;
  localStorage.setItem("refresh_ms",ms);
  document.getElementById("curInterval").innerText = ms/1000+" 秒";
  document.querySelectorAll("#refreshBtns button").forEach(b=>b.classList.remove("active"));
  document.getElementById("r"+ms).classList.add("active");
  restartTimers();
}

function restartTimers(){
  if(refreshTimer){ clearInterval(refreshTimer); }
  refreshTimer = setInterval(()=>{
    updatePrices();
    updateRongCandle();
    updateCrcCandle();
  }, refreshInterval);
}

// ===== 启动 =====
switchRongTF(rTF); switchCrcTF(cTF);
setRefresh(refreshInterval); // 恢复上次选择的刷新间隔
