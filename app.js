// version: v1.07

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
    if (typeof window.ethereum.request === "function") return await window.ethereum.request({ method: "eth_accounts" });
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    return await provider.send("eth_accounts", []);
  }catch(e){ return []; }
}
async function getChainIdHex(){
  if (!window.ethereum) return null;
  try{
    if (typeof window.ethereum.request === "function") return await window.ethereum.request({ method: "eth_chainId" });
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    const net = await provider.getNetwork();
    return "0x" + net.chainId.toString(16);
  }catch(e){ return null; }
}

/*********** 主题：缓存读写 ***********/
function saveThemeColors(main, secondary){
  localStorage.setItem(LS_KEY.THEME, JSON.stringify({ main, secondary, ver: BG_IMAGE_VERSION }));
}
function loadThemeColors(){
  try {
    const obj = JSON.parse(localStorage.getItem(LS_KEY.THEME));
    if (obj && obj.ver === BG_IMAGE_VERSION && obj.main && obj.secondary) return obj;
  } catch(e){}
  return null;
}
function applyCssTheme(main, secondary){
  const root = document.documentElement;
  if (main)      root.style.setProperty("--theme-main", main);
  if (secondary) root.style.setProperty("--theme-secondary", secondary);
}

/*********** 颜色工具 + 聚类取色（更接近原图） ***********/
function toHex(c){ return c.toString(16).padStart(2,"0"); }
function rgbToHex(r,g,b){ return `#${toHex(r)}${toHex(g)}${toHex(b)}`; }
function lum([r,g,b]){ return 0.2126*r + 0.7152*g + 0.0722*b; }
function dist2(a,b){ const dr=a[0]-b[0], dg=a[1]-b[1], db=a[2]-b[2]; return dr*dr+dg*dg+db*db; }

/** 对 bitmap 进行快速聚类（近似 k-means），返回两种最能代表且对比度较好的颜色 */
function paletteFromBitmap(bitmap){
  const w = 64, h = 64;
  const cvs = document.createElement("canvas"); cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  const data = ctx.getImageData(0,0,w,h).data;

  // 采样与预聚合（16 级量化 → 降噪）
  const buckets = new Map();
  for(let i=0;i<data.length;i+=4){
    const a = data[i+3]; if (a < 200) continue; // 透明区域忽略
    const r = data[i], g = data[i+1], b = data[i+2];
    const key = ((r>>4)<<8) | ((g>>4)<<4) | (b>>4);
    const rec = buckets.get(key) || { c:0, sum:[0,0,0] };
    rec.c++; rec.sum[0]+=r; rec.sum[1]+=g; rec.sum[2]+=b;
    buckets.set(key, rec);
  }
  const points = [];
  buckets.forEach(v=>{
    points.push([ (v.sum[0]/v.c)|0, (v.sum[1]/v.c)|0, (v.sum[2]/v.c)|0, v.c ]);
  });
  points.sort((a,b)=> b[3]-a[3]); // 先按像素数排序

  // 取前 N 个候选，再挑“最远”的两色，保证对比/渐变层次
  const N = Math.min(12, points.length);
  let bestA = points[0] || [13,27,42,1], bestB = points[1] || [27,38,59,1], bestD = -1;
  for(let i=0;i<N;i++){
    for(let j=i+1;j<N;j++){
      const d = dist2(points[i], points[j]);
      if (d > bestD){
        // 避免两色亮度过近
        const l1 = lum(points[i]), l2 = lum(points[j]);
        if (Math.abs(l1 - l2) < 12) continue;
        bestD = d; bestA = points[i]; bestB = points[j];
      }
    }
  }

  // 主色置暗（用于渐变起点），次色置亮（用于渐变终点）
  let main = bestA, secondary = bestB;
  if (lum(main) > lum(secondary)) [main, secondary] = [secondary, main];

  return {
    main: rgbToHex(main[0], main[1], main[2]),
    secondary: rgbToHex(secondary[0], secondary[1], secondary[2]),
  };
}

/*********** 背景：严格自动取色 → 占位渐变 → 解码完成后淡入原图 ***********/
async function autoStrictPipeline(src){
  const bgColorEl = document.getElementById("bgColor");
  const bgEl = document.getElementById("bg");
  if (!bgColorEl || !bgEl) return;

  // 若已有匹配版本的缓存色，立刻应用并显示占位渐变（避免首屏空白）
  const cached = loadThemeColors();
  if (cached){
    applyCssTheme(cached.main, cached.secondary);
    bgColorEl.classList.remove("hidden");
  }

  try{
    // 1) 拉取图片 blob（一次请求同时用于取色与显示）
    const resp = await fetch(src, { cache: "force-cache", mode: IMAGE_CROSSORIGIN ? "cors" : "no-cors" });
    const blob = await resp.blob();
    // 2) 生成缩略位图并取色（更接近原图）
    let bmp;
    if ("createImageBitmap" in window){
      bmp = await createImageBitmap(blob, { resizeWidth:64, resizeHeight:64 });
    } else {
      // 兼容：退化成 Image + canvas
      const tmpImg = await blobToImage(blob);
      bmp = tmpImg; // 下方 paletteFromBitmap 同样支持 drawImage(Image,...)
    }
    const pal = paletteFromBitmap(bmp);
    applyCssTheme(pal.main, pal.secondary);
    saveThemeColors(pal.main, pal.secondary);
    // 确保占位渐变已显示
    bgColorEl.classList.remove("hidden");

    // 3) 用同一份 blob 显示真实背景，等待 decode 后淡入
    const url = URL.createObjectURL(blob);
    await decodeImage(url);
    bgEl.style.backgroundImage = `url("${url}")`;
    requestAnimationFrame(()=> bgEl.classList.add("show"));
    // 可稍后释放 URL（等过渡完成）
    setTimeout(()=> URL.revokeObjectURL(url), 1500);
  }catch(e){
    // 失败则仅显示占位渐变，不阻塞其它功能
    bgColorEl.classList.remove("hidden");
  }
}

/** 工具：blob → <img> */
function blobToImage(blob){
  return new Promise((res, rej)=>{
    const url = URL.createObjectURL(blob);
    const img = new Image();
    if (IMAGE_CROSSORIGIN) img.crossOrigin = "anonymous";
    img.onload = ()=>{ URL.revokeObjectURL(url); res(img); };
    img.onerror = (err)=>{ URL.revokeObjectURL(url); rej(err); };
    img.src = url;
  });
}
/** 工具：等待图片 decode 完成（用于淡入时机更平滑） */
function decodeImage(url){
  return new Promise((res)=>{
    const img = new Image();
    if (IMAGE_CROSSORIGIN) img.crossOrigin = "anonymous";
    img.onload = ()=>{ if (img.decode) img.decode().then(res).catch(res); else res(); };
    img.onerror = ()=> res();
    img.src = url;
  });
}

/*********** 首屏：模式分支 ***********/
function initThemePlaceholder(){
  const bgColorEl = document.getElementById("bgColor");
  if (!bgColorEl) return;

  if (THEME_MODE === "manual"){
    applyCssTheme(THEME_MANUAL_MAIN, THEME_MANUAL_SECONDARY);
    bgColorEl.classList.remove("hidden");
    return;
  }
  if (THEME_MODE === "auto"){
    const stored = loadThemeColors();
    if (stored) applyCssTheme(stored.main, stored.secondary);
    // auto 模式占位渐变直接显示（若无缓存则先用默认色）
    bgColorEl.classList.remove("hidden");
    return;
  }
  if (THEME_MODE === "auto_strict"){
    // 严格模式：是否显示由 autoStrictPipeline 决定（有缓存会立刻展示）
    // 这里不主动显示，占位层默认 hidden，避免“错色闪现”
    return;
  }
}

/*********** 连接钱包/退出/守卫（保持原逻辑） ***********/
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

  // 1) 初始化占位层策略
  initThemePlaceholder();

  // 2) 严格自动取色 + 占位渐变 + 解码后淡入原图
  if (THEME_MODE === "auto_strict"){
    await autoStrictPipeline(BG_IMAGE_SRC);
  } else {
    // 兼容其它模式：直接预载并淡入（保留旧逻辑的一致体验）
    await (async function preloadAndShowBackground(src){
      const bgEl = document.getElementById("bg");
      const img = new Image();
      if (IMAGE_CROSSORIGIN) img.crossOrigin = "anonymous";
      img.onload = ()=>{
        bgEl.style.backgroundImage = `url("${src}")`;
        requestAnimationFrame(()=> bgEl.classList.add("show"));
      };
      img.src = src;
      if (img.decode) img.decode().catch(()=>{});
    })(BG_IMAGE_SRC);
    // 确保占位层显示（auto/manual）
    const bgColorEl = document.getElementById("bgColor");
    if (bgColorEl) bgColorEl.classList.remove("hidden");
  }

  const p = location.pathname;
  if (p.endsWith("/") || p.endsWith("index.html")) {
    await guardLoginPage();
  } else {
    await guardAppPage();
    setActiveTabbar();
  }
});
