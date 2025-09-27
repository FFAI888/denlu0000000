// version: v1.06

/*********** 版本徽标 ***********/
function setVersionBadge(){
  const el = document.getElementById("verBadge");
  if (el && typeof APP_VERSION === "string") el.textContent = APP_VERSION;
}

/*********** 本地会话 ***********/
function saveSession(addr, chainId){
  localStorage.setItem(LS_KEY.SESSION, JSON.stringify({ addr, chainId, ts: Date.now() }));
}
function loadSession(){ try { return JSON.parse(localStorage.getItem(LS_KEY.SESSION)); } catch(e){ return null; } }
function clearSession(){ localStorage.removeItem(LS_KEY.SESSION); }
function isSessionFresh(sess){ return !!(sess && typeof sess.ts === "number" && (Date.now() - sess.ts) <= SESSION_TTL_MS); }

/*********** Provider 辅助 ***********/
async function getAuthorizedAccounts(){
  if (!window.ethereum) return [];
  try{
    if (typeof window.ethereum.request === "function"){
      return await window.ethereum.request({ method: "eth_accounts" }); // 不弹窗
    }else{
      const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      return await provider.send("eth_accounts", []);
    }
  }catch(e){ return []; }
}
async function getChainIdHex(){
  if (!window.ethereum) return null;
  try{
    if (typeof window.ethereum.request === "function"){
      return await window.ethereum.request({ method: "eth_chainId" });
    }else{
      const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      const net = await provider.getNetwork();
      return "0x" + net.chainId.toString(16);
    }
  }catch(e){ return null; }
}

/*********** 主题：存取与应用（用于占位渐变） ***********/
function saveThemeColors(main, secondary){ localStorage.setItem(LS_KEY.THEME, JSON.stringify({ main, secondary })); }
function loadThemeColors(){ try { return JSON.parse(localStorage.getItem(LS_KEY.THEME)); } catch(e){ return null; } }
function applyCssTheme(main, secondary){
  const root = document.documentElement;
  if (main)      root.style.setProperty("--theme-main", main);
  if (secondary) root.style.setProperty("--theme-secondary", secondary);
}

/* 颜色工具/取色（与上版一致） */
function toHex(c){ return c.toString(16).padStart(2,"0"); }
function rgbToHex(r,g,b){ return `#${toHex(r)}${toHex(g)}${toHex(b)}`; }
function dist2(a,b){ const dr=a[0]-b[0], dg=a[1]-b[1], db=a[2]-b[2]; return dr*dr+dg*dg+db*db; }
function extractPaletteFromImage(img){
  const w = 48, h = 48;
  const cvs = document.createElement("canvas"); cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0,0,w,h).data;
  const buckets = new Map();
  for(let i=0;i<data.length;i+=4){
    const a = data[i+3]; if (a < 128) continue;
    const r = data[i], g = data[i+1], b = data[i+2];
    const key = ((r>>4)<<8) | ((g>>4)<<4) | (b>>4);
    const rec = buckets.get(key) || {count:0, sum:[0,0,0]};
    rec.count++; rec.sum[0]+=r; rec.sum[1]+=g; rec.sum[2]+=b;
    buckets.set(key, rec);
  }
  const arr = [];
  buckets.forEach(v => arr.push({ c: v.count, avg: [(v.sum[0]/v.count)|0, (v.sum[1]/v.count)|0, (v.sum[2]/v.count)|0] }));
  arr.sort((a,b)=> b.c-a.c);
  const top = arr.slice(0,10);
  const main = top.length ? top[0].avg : [13,27,42];
  let sec = [27,38,59], md = -1;
  for(let i=1;i<top.length;i++){
    const d = dist2(top[i].avg, main); if (d>md){ md=d; sec=top[i].avg; }
  }
  return { main: rgbToHex(main[0],main[1],main[2]), secondary: rgbToHex(sec[0],sec[1],sec[2]) };
}

/*********** 背景：预载并淡入（避免逐行显现） ***********/
function preloadAndShowBackground(src="tupian/bg.jpg"){
  const el = document.getElementById("bg");
  if (!el) return;

  const img = new Image();
  if (IMAGE_CROSSORIGIN) img.crossOrigin = "anonymous";

  img.onload = () => {
    // THEME_MODE === "auto" 才尝试从图片提色；manual 模式完全尊重手动色
    if (THEME_MODE === "auto"){
      const stored = loadThemeColors();
      try {
        const { main, secondary } = extractPaletteFromImage(img);
        // 无缓存或缓存缺失 → 保存并应用（占位渐变即时更新到与图片更像）
        if (!stored || !stored.main || !stored.secondary){
          applyCssTheme(main, secondary);
          saveThemeColors(main, secondary);
        }
      } catch(e){ /* 忽略取色失败（可能跨域或图片特殊），保留占位色 */ }
    }

    // 设置背景并淡入
    el.style.backgroundImage = `url("${src}")`;
    requestAnimationFrame(()=> el.classList.add("show"));
  };
  img.onerror = () => { /* 加载失败就继续用渐变，不阻断页面 */ };

  img.src = src;
  if (img.decode) { img.decode().catch(()=>{}); }
}

/*********** 首屏：占位色策略 ***********/
function initThemePlaceholder(){
  if (THEME_MODE === "manual"){
    // 你手动指定的两种颜色，100% 可控，首屏即一致
    applyCssTheme(THEME_MANUAL_MAIN, THEME_MANUAL_SECONDARY);
    return;
  }
  // auto 模式：优先缓存色，没有则用 CSS 默认值，稍后取色成功会自动更新
  const stored = loadThemeColors();
  if (stored && stored.main && stored.secondary){
    applyCssTheme(stored.main, stored.secondary);
  }
}

/*********** 连接/退出 与 守卫（保持不变） ***********/
async function connectWallet(){
  const status = document.getElementById("status");
  const say = (t)=>{ if(status) status.textContent = "状态：" + t; };

  if (!window.ethereum) { say("未检测到钱包，请在 MetaMask/OKX 钱包内置浏览器打开"); return; }

  try {
    let accounts = [];
    if (typeof window.ethereum.request === "function") {
      accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    } else {
      const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      accounts = await provider.send("eth_requestAccounts", []);
    }
    if (!accounts || !accounts.length) { say("未获取到账户"); return; }

    let chainIdHex = await getChainIdHex();
    if (!chainIdHex || chainIdHex.toLowerCase() !== SUPPORTED_CHAIN_HEX.toLowerCase()) { say("请切换到 BSC 主网后重试"); return; }

    const addr = accounts[0];
    say("已连接 " + addr.slice(0,6) + "..." + addr.slice(-4));
    saveSession(addr, SUPPORTED_CHAIN_HEX);
    window.location.href = "home.html";
  } catch (err) {
    const msg = err && (err.message || err.reason) ? (err.message || err.reason) : String(err);
    const code = err && err.code ? ` (code:${err.code})` : "";
    if (status) status.textContent = "状态：连接失败 - " + msg + code;
  }
}
function logout(){ clearSession(); window.location.href = "index.html"; }

function attachProviderGuards(){
  if (!window.ethereum) return;
  window.ethereum.on?.("accountsChanged", (accs)=>{
    const sess = loadSession();
    const current = accs && accs[0] ? accs[0].toLowerCase() : "";
    const valid = sess && sess.addr && sess.addr.toLowerCase() === current;
    if (!current || !valid) { clearSession(); window.location.href = "index.html"; }
  });
  window.ethereum.on?.("chainChanged", (cid)=>{
    if (!cid || cid.toLowerCase() !== SUPPORTED_CHAIN_HEX.toLowerCase()) {
      clearSession(); window.location.href = "index.html";
    }
  });
}

/*********** 会话严格校验（30 分钟 + 地址一致 + BSC） ***********/
async function verifySessionStrict(){
  const sess = loadSession();
  if (!sess) return { ok:false, reason:"no-session" };
  if (!isSessionFresh(sess)) return { ok:false, reason:"expired" };
  if (!sess.chainId || sess.chainId.toLowerCase() !== SUPPORTED_CHAIN_HEX.toLowerCase())
    return { ok:false, reason:"wrong-chain-in-session" };

  if (!window.ethereum) return { ok:false, reason:"no-ethereum" };

  const chainIdHex = await getChainIdHex();
  if (!chainIdHex || chainIdHex.toLowerCase() !== SUPPORTED_CHAIN_HEX.toLowerCase())
    return { ok:false, reason:"wrong-chain-now" };

  const accs = await getAuthorizedAccounts();
  const current = accs && accs[0] ? accs[0].toLowerCase() : "";
  if (!current) return { ok:false, reason:"no-authorized-account" };
  if (current !== sess.addr.toLowerCase()) return { ok:false, reason:"addr-mismatch" };

  return { ok:true };
}

/*********** 页面守卫与导航 ***********/
async function guardLoginPage(){
  const result = await verifySessionStrict();
  if (result.ok) { window.location.href = "home.html"; return; }
  const btn = document.getElementById("connectBtn");
  if (btn) btn.onclick = connectWallet;
}
async function guardAppPage(){
  const result = await verifySessionStrict();
  if (!result.ok) { clearSession(); window.location.href = "index.html"; return; }

  const sess = loadSession();
  ["addrLine","addrGroup","addrEarn","addrSwap","addrMine"].forEach(id=>{
    const el = document.getElementById(id); if (el) el.textContent = "地址：" + sess.addr;
  });
  attachProviderGuards();

  setInterval(async ()=>{
    const ok = await verifySessionStrict();
    if (!ok.ok) { clearSession(); window.location.href = "index.html"; }
  }, 15000);
}
function setActiveTabbar(){
  const path = location.pathname;
  const map = [
    {key:"home",  match:"home.html"},
    {key:"group", match:"group.html"},
    {key:"earn",  match:"earn.html"},
    {key:"swap",  match:"swap.html"},
    {key:"mine",  match:"mine.html"},
  ];
  let activeKey = "home";
  for (const m of map){ if (path.endsWith(m.match)) { activeKey = m.key; break; } }
  document.querySelectorAll(".tabbar a").forEach(a=>{
    const k = a.getAttribute("data-tab");
    if (k === activeKey) a.classList.add("active"); else a.classList.remove("active");
  });
}

/*********** 启动 ***********/
window.addEventListener("DOMContentLoaded", async ()=>{
  setVersionBadge();

  // 1) 占位色：manual 立即使用你设置的颜色；auto 先用缓存
  initThemePlaceholder();
  // 2) 预载大图，成功后淡入（auto 时可顺带更新缓存色）
  preloadAndShowBackground("tupian/bg.jpg");

  const p = location.pathname;
  if (p.endsWith("/") || p.endsWith("index.html")) {
    await guardLoginPage();
  } else {
    await guardAppPage();
    setActiveTabbar();
  }
});
