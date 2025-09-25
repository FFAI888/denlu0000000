// 全局变量
let refreshInterval = 3000; // 默认 3 秒
let refreshTimer = null;

// 代币合约地址
const RONG_ADDR = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e"; // RongChain
const CRC_ADDR  = "0x5b2fe2b06e714b7bea4fd35b428077d850c48087"; // CRC
const USDT_ADDR = "0x55d398326f99059ff775485246999027b3197955"; // USDT

// 池子地址
const POOL_RONG_USDT = "0x7f20dE20b53b8145F75F7a7Bc55CC90AEFEeb795";
const POOL_RONG_CRC  = "0x8cDb69f2dDE96fB98FB5AfA6eB553eaB308D16a5";

// ABI
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)"
];
const PAIR_ABI = [
  "function getReserves() view returns (uint112,uint112,uint32)",
  "function token0() view returns (address)",
  "function token1() view returns (address)"
];

// 刷新设置
function setRefresh(ms){
  refreshInterval = ms;
  document.getElementById("curInterval").innerText = (ms/1000) + " 秒";
  localStorage.setItem("refreshInterval", ms);
  if(refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(updateData, refreshInterval);
  highlightBtn(ms);
}

function highlightBtn(ms){
  ["r1000","r3000","r5000","r10000"].forEach(id=>{
    document.getElementById(id).style.background = "#3b82f6";
  });
  const btnId = "r" + ms;
  if(document.getElementById(btnId)){
    document.getElementById(btnId).style.background = "#16a34a";
  }
}

// 进入管理后台
function goAdmin(){
  window.location.href = "admin.html";
}

// 全屏模式
function openFullscreen(id){
  const el = document.getElementById(id);
  if(el.requestFullscreen) el.requestFullscreen();
  else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else if(el.mozRequestFullScreen) el.mozRequestFullScreen();
  else if(el.msRequestFullscreen) el.msRequestFullscreen();
  el.classList.add("fullscreen");
  document.getElementById("exitFullscreenBtn").style.display = "inline-block";
}

function closeFullscreen(){
  if(document.exitFullscreen) document.exitFullscreen();
  else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
  else if(document.mozCancelFullScreen) document.mozCancelFullScreen();
  else if(document.msExitFullscreen) document.msExitFullscreen();
  const el = document.querySelector(".fullscreen");
  if(el) el.classList.remove("fullscreen");
  document.getElementById("exitFullscreenBtn").style.display = "none";
}

// 主题切换
function switchTheme(theme){
  const urls = {
    rongUsdt: `https://dexscreener.com/bsc/${POOL_RONG_USDT}?embed=1&theme=${theme}&trades=0&info=0`,
    rongCrc: `https://dexscreener.com/bsc/${POOL_RONG_CRC}?embed=1&theme=${theme}&trades=0&info=0`
  };
  document.getElementById("dexRongUsdt").src = urls.rongUsdt;
  document.getElementById("dexRongCrc").src = urls.rongCrc;
}

// DexScreener API 获取 24h 涨跌幅
async function fetchDexChange(poolAddr){
  try{
    const url = `https://api.dexscreener.com/latest/dex/pairs/bsc/${poolAddr}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if(data && data.pair && data.pair.priceChange){
      return data.pair.priceChange.h24 || "0";
    }
    return "0";
  }catch(e){
    console.warn("DexScreener 获取涨跌幅失败", e);
    return "0";
  }
}

// 设置涨跌幅样式 + 箭头
function setChangeStyle(elId, changeStr){
  const el = document.getElementById(elId);
  el.className = ""; // 清空原有样式
  const val = parseFloat(changeStr);
  if(val > 0){
    el.innerText = "↑ +" + changeStr + "%";
    el.classList.add("change-up");
  }else if(val < 0){
    el.innerText = "↓ " + changeStr + "%";
    el.classList.add("change-down");
  }else{
    el.innerText = "→ 0%";
    el.classList.add("change-flat");
  }
}

// 更新网页标题
function updateTitle(price, change){
  const val = parseFloat(change);
  let arrow = "→";
  if(val > 0) arrow = "↑";
  else if(val < 0) arrow = "↓";
  document.title = `RONG ${price.toFixed(4)} USDT ${arrow}${change}%`;
}

// 链上余额/价格更新
async function updateData(){
  try{
    const addr = localStorage.getItem("walletAddress");
    if(!addr){
      document.getElementById("wallet").innerText = "未连接";
      return;
    }
    document.getElementById("wallet").innerText = "钱包地址: " + addr;

    const provider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");

    // --- 获取余额 ---
    const rong = new ethers.Contract(RONG_ADDR, ERC20_ABI, provider);
    const crc  = new ethers.Contract(CRC_ADDR,  ERC20_ABI, provider);

    const [decRong, balRong, decCrc, balCrc] = await Promise.all([
      rong.decimals(), rong.balanceOf(addr),
      crc.decimals(),  crc.balanceOf(addr)
    ]);

    const humanRong = (balRong / 10**decRong).toFixed(4);
    const humanCrc  = (balCrc  / 10**decCrc ).toFixed(4);

    document.getElementById("balance").innerText = humanRong + " RONG";
    document.getElementById("crcBalance").innerText = humanCrc + " CRC";

    // --- 获取价格 ---
    async function getPrice(poolAddr, tokenWant, tokenBase){
      const pool = new ethers.Contract(poolAddr, PAIR_ABI, provider);
      const [r0,r1] = await pool.getReserves();
      const t0 = await pool.token0();
      const t1 = await pool.token1();
      let price = 0;
      if(t0.toLowerCase() === tokenWant.toLowerCase() && t1.toLowerCase() === tokenBase.toLowerCase()){
        price = Number(r1) / Number(r0);
      }else if(t1.toLowerCase() === tokenWant.toLowerCase() && t0.toLowerCase() === tokenBase.toLowerCase()){
        price = Number(r0) / Number(r1);
      }
      return price;
    }

    const priceRongUsdt = await getPrice(POOL_RONG_USDT, RONG_ADDR, USDT_ADDR);
    const priceRongCrc  = await getPrice(POOL_RONG_CRC,  RONG_ADDR, CRC_ADDR);

    document.getElementById("price").innerText = priceRongUsdt.toFixed(6) + " USDT";
    if(priceRongCrc > 0){
      const priceCrcUsdt = priceRongUsdt / priceRongCrc;
      document.getElementById("crcPrice").innerText = priceCrcUsdt.toFixed(6) + " USDT";
    }else{
      document.getElementById("crcPrice").innerText = "暂无价格";
    }

    // --- 获取 24h 涨跌幅 ---
    const [changeRong, changeCrc] = await Promise.all([
      fetchDexChange(POOL_RONG_USDT),
      fetchDexChange(POOL_RONG_CRC)
    ]);
    setChangeStyle("rongChange", changeRong);
    setChangeStyle("crcChange", changeCrc);

    // --- 更新网页标题 ---
    updateTitle(priceRongUsdt, changeRong);

  }catch(e){
    console.error("更新数据出错", e);
  }
}

// 初始化
window.onload = ()=>{
  const saved = localStorage.getItem("refreshInterval");
  if(saved){
    refreshInterval = parseInt(saved);
  }
  document.getElementById("curInterval").innerText = (refreshInterval/1000) + " 秒";
  highlightBtn(refreshInterval);
  refreshTimer = setInterval(updateData, refreshInterval);
  updateData();
};
