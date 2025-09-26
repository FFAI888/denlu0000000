// v9.8 app.js 完整版
// ================================
// Toast 系统 + 会话管理 + 登录守卫 + 管理守卫 + 行情 + GraphQL 历史 + 链上实时 + K 线
// ================================

// ===== Toast 提示系统 =====
function showToast(msg, type="info") {
  const box = document.getElementById("toastBox");
  if(!box) return;
  const div = document.createElement("div");
  div.className = `toast ${type}`;
  div.textContent = msg;
  box.appendChild(div);

  // 播放声音/震动
  if(type==="success") {
    navigator.vibrate?.(200);
  } else if(type==="error") {
    navigator.vibrate?.([300,100,300]);
  }

  setTimeout(()=>div.remove(), toastDuration);
}

// ===== 会话管理 =====
function saveSession(addr){
  localStorage.setItem("session", JSON.stringify({
    addr, ts: Date.now()
  }));
}
function loadSession(){
  const s = localStorage.getItem("session");
  if(!s) return null;
  const obj = JSON.parse(s);
  if(Date.now()-obj.ts > SESSION_TIMEOUT){
    clearSession();
    return null;
  }
  return obj;
}
function clearSession(){
  localStorage.removeItem("session");
}

// ===== 登录逻辑 =====
async function connectWallet(){
  if(!window.ethereum){
    showToast("请先安装钱包","error");
    return;
  }
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const net = await provider.getNetwork();
  if(net.chainId !== SUPPORTED_CHAIN_DEC){
    showToast("请切换到BSC主网","error");
    return;
  }
  const accounts = await provider.send("eth_requestAccounts",[]);
  const addr = accounts[0];
  saveSession(addr);
  showToast("登录成功","success");
  window.location.href="home.html";
}
async function logout(){
  clearSession();
  showToast("已退出","info");
  window.location.href="index.html";
}

// ===== 页面守卫 =====
async function guardLogin(){
  const s = loadSession();
  if(s) window.location.href="home.html";
  const btn = document.getElementById("connectBtn");
  if(btn) btn.onclick = connectWallet;
}
async function guardHome(){
  const s = loadSession();
  if(!s){
    showToast("会话过期，请重新登录","error");
    window.location.href="index.html";
    return;
  }
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const net = await provider.getNetwork();
  if(net.chainId !== SUPPORTED_CHAIN_DEC){
    showToast("请切换到BSC主网","error");
    logout();
    return;
  }
  document.getElementById("addrLine").textContent = "地址：" + s.addr;
  document.getElementById("netLine").textContent = "网络：BSC";
  document.getElementById("sessionLine").textContent = "会话有效";
}
async function guardAdmin(){
  const s = loadSession();
  if(!s){
    showToast("请先登录","error");
    window.location.href="index.html";
    return;
  }
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const contract = new ethers.Contract(WHITELIST_ADDR, ABI, signer);

  try {
    const ok = await contract.isWhitelisted(s.addr);
    if(!ok){
      showToast("非白名单，禁止进入","error");
      logout();
      return;
    }
    document.getElementById("adminAddr").textContent = "地址：" + s.addr;
    document.getElementById("adminNet").textContent = "网络：BSC";
    document.getElementById("adminRole").textContent = "白名单用户 ✅";
  } catch(e){
    console.error(e);
    showToast("白名单检测失败","error");
    logout();
  }
}

// ===== 初始化 =====
window.addEventListener("DOMContentLoaded", ()=>{
  const path = window.location.pathname;
  if(path.endsWith("/") || path.endsWith("index.html")) guardLogin();
  if(path.endsWith("home.html")) guardHome();
  if(path.endsWith("admin.html")) guardAdmin();
});

// ===== K线工具函数 =====
function intervalMs(interval){
  if(interval==="1m") return 60*1000;
  if(interval==="1h") return 3600*1000;
  if(interval==="1d") return 86400*1000;
  return 60*1000;
}

// ===== K线数据结构 =====
let kline = { interval: KLINE_DEFAULT_INTERVAL, candles: [] };
let kChart = null;
let priceTimer = null;

// ===== GraphQL 查询助手 =====
async function fetchGraphQL(query) {
  const res = await fetch(PANCAKE_GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  return res.json();
}

// ===== 加载 PancakeSwap GraphQL 历史行情 =====
async function loadGraphHistory(pairAddr, interval="1m") {
  try {
    let field = "pairMinuteDatas";
    let order = "minuteStartUnix";
    if(interval==="1h") { field="pairHourDatas"; order="hourStartUnix"; }
    if(interval==="1d") { field="pairDayDatas"; order="date"; }

    const query = `{
      ${field}(first:60, orderBy:${order}, orderDirection:desc, where:{pair:"${pairAddr.toLowerCase()}"}) {
        ${order}
        reserve0
        reserve1
      }
    }`;

    const data = await fetchGraphQL(query);
    const list = data.data[field];

    kline.candles = list.reverse().map(item=>{
      const t = Number(item[order])*1000;
      const r0 = parseFloat(item.reserve0);
      const r1 = parseFloat(item.reserve1);
      const price = r0>0 && r1>0 ? r0/r1 : 0;
      return { t, o:price, h:price, l:price, c:price };
    });
    drawKline();
    showToast("GraphQL 历史行情已载入","success");
  } catch(e) {
    console.error(e);
    showToast("GraphQL 历史加载失败","warning");
  }
}

// ===== 链上实时价格 =====
async function refreshPrices(){
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    // RONG/USDT
    const c1 = new ethers.Contract(PAIRS.RONG_USDT, PAIR_ABI, provider);
    const r1 = await c1.getReserves();
    const pRongUsdt = Number(r1[0])/Number(r1[1]);
    document.getElementById("priceRongUsdt").textContent = pRongUsdt.toFixed(6);

    // RONG/CRC
    const c2 = new ethers.Contract(PAIRS.RONG_CRC, PAIR_ABI, provider);
    const r2 = await c2.getReserves();
    const pRongCrc = Number(r2[0])/Number(r2[1]);
    document.getElementById("priceRongCrc").textContent = pRongCrc.toFixed(6);

    // CRC/USDT 推导
    const pCrcUsdt = pRongUsdt / pRongCrc;
    document.getElementById("priceCrcUsdt").textContent = pCrcUsdt.toFixed(6);

    // 推送到 K 线
    feedPriceToKline(pRongUsdt);

  } catch(e){
    console.error(e);
    showToast("价格刷新失败","error");
  }
}

// ===== 推送实时价格到 K线 =====
function feedPriceToKline(price){
  if(!price) return;
  const now = Date.now();
  const ms = intervalMs(kline.interval);
  const last = kline.candles[kline.candles.length-1];
  if(last && now - last.t < ms){
    last.c = price;
    if(price>last.h) last.h = price;
    if(price<last.l) last.l = price;
  } else {
    kline.candles.push({ t: now, o:price, h:price, l:price, c:price });
  }
  drawKline();
}

// ===== 绘制 K线 =====
function drawKline(){
  const ctx = document.getElementById("klineCanvas");
  if(!ctx) return;
  const data = kline.candles.map(c=>({
    x: c.t, o: c.o, h: c.h, l: c.l, c: c.c
  }));

  if(!kChart){
    kChart = new Chart(ctx, {
      type: 'candlestick',
      data: { datasets:[{label:'价格',data}] },
      options: {
        parsing:false,
        plugins:{ legend:{display:false} },
        scales:{ x:{ type:"time", time:{unit:"minute"} }, y:{ beginAtZero:false } }
      }
    });
  } else {
    kChart.data.datasets[0].data = data;
    kChart.update();
  }
}

// ===== 切换周期 =====
function switchKInterval(v){
  if(!KLINE_SUPPORTED.includes(v)) return;
  kline.interval = v;
  kline.candles = [];
  drawKline();
  loadGraphHistory(PAIRS.RONG_USDT, v);
}

// ===== 重置K线 =====
function resetKline(){
  kline.candles=[];
  drawKline();
}

// ===== 首页行情启动 =====
window.addEventListener("DOMContentLoaded", ()=>{
  const path = window.location.pathname;
  if(path.endsWith("home.html")){
    guardHome().then(()=>{
      if(priceTimer) clearInterval(priceTimer);
      loadGraphHistory(PAIRS.RONG_USDT, kline.interval);
      refreshPrices();
      priceTimer = setInterval(refreshPrices, PRICE_REFRESH_MS);
    });
  }
});
