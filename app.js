/* v1.52 首页逻辑：余额 + 价格 + DexScreener 交易所风格 K线图 */

const RONGCHAIN_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e";
const CRC_TOKEN       = "0x5b2fe2b06e714b7bea4fd35b428077d850c48087";
const USDT            = "0x55d398326f99059ff775485246999027b3197955";

// DexScreener 池子地址
const RONG_USDT_PAIR  = "0x7f20dE20b53b8145F75F7a7Bc55CC90AEFEeb795";
const RONG_CRC_PAIR   = "0x8cDb69f2dDE96fB98FB5AfA6eB553eaB308D16a5";

const erc20Abi = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)"
];

let provider = null;
const ACCOUNT = localStorage.getItem("walletAddress") || null;

/* 显示钱包 */
function showWallet(){
  const el = document.getElementById("wallet");
  if(el) el.innerText = ACCOUNT ? ("钱包地址: " + ACCOUNT) : "钱包地址: 未登录";
}

/* provider */
function getProvider(){
  if (!provider){
    if (!window.ethereum) throw new Error("未检测到钱包环境");
    provider = new ethers.providers.Web3Provider(window.ethereum);
  }
  return provider;
}

/* 查询余额 */
async function fetchBalance(tokenAddr, elId){
  try{
    if (!ACCOUNT) throw new Error("未登录");
    const p = getProvider();
    const c = new ethers.Contract(tokenAddr, erc20Abi, p);
    const [dec, sym, bal] = await Promise.all([c.decimals(), c.symbol(), c.balanceOf(ACCOUNT)]);
    const formatted = ethers.utils.formatUnits(bal, dec);
    const el = document.getElementById(elId);
    if(el) el.innerText = `${formatted} ${sym}`;
  }catch(e){
    const el = document.getElementById(elId);
    if(el) el.innerText = "❌ 余额获取失败";
  }
}

/* DexScreener 图表加载 */
async function loadDexChart(pairAddr, containerId){
  try{
    const url = `https://api.dexscreener.com/latest/dex/pairs/bsc/${pairAddr}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if(!data.pair) throw new Error("无行情");

    const el = document.getElementById(containerId);
    const chart = LightweightCharts.createChart(el, {
      width: el.clientWidth,
      height: 400,
      layout: { background: { color: "#fff" }, textColor: "#000" },
      grid: { vertLines: { color: "#eee" }, horzLines: { color: "#eee" } },
      timeScale: { timeVisible: true, secondsVisible: false }
    });
    const series = chart.addCandlestickSeries();

    // 初始化一根蜡烛
    const price = parseFloat(data.pair.priceUsd);
    const now = Math.floor(Date.now()/1000);
    series.setData([{ time: now, open: price, high: price, low: price, close: price }]);

    // 实时更新
    setInterval(async ()=>{
      try{
        const r = await fetch(url);
        const d = await r.json();
        const price = parseFloat(d.pair.priceUsd);
        const now = Math.floor(Date.now()/1000);
        series.update({ time: now, open: price, high: price, low: price, close: price });
      }catch(e){ console.error("更新失败", e); }
    }, 5000);
  }catch(e){
    console.error("K线图加载失败", e);
    document.getElementById(containerId).innerText = "❌ 无法加载行情图";
  }
}

/* 管理后台 */
function goAdmin(){ window.location.href = "admin.html"; }

/* 启动 */
(function start(){
  showWallet();
  fetchBalance(RONGCHAIN_TOKEN, "balance");
  fetchBalance(CRC_TOKEN, "crcBalance");
  loadDexChart(RONG_USDT_PAIR, "rongChart");
  loadDexChart(RONG_CRC_PAIR, "crcChart");
})();
