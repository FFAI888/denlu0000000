// version: v1.07

/*********** 版本徽标 ***********/
function setVersionBadge(){
  const el = document.getElementById("verBadge");
  if (el && typeof APP_VERSION === "string") el.textContent = APP_VERSION;
}

/*********** HSB → RGB/HEX ***********/
function hsvToRgb(h, sPct, vPct){
  const s = sPct/100, v = vPct/100;
  const c = v*s;
  const x = c*(1 - Math.abs(((h/60)%2) - 1));
  const m = v - c;
  let r=0,g=0,b=0;
  if (0<=h && h<60){ r=c; g=x; b=0; }
  else if (60<=h && h<120){ r=x; g=c; b=0; }
  else if (120<=h && h<180){ r=0; g=c; b=x; }
  else if (180<=h && h<240){ r=0; g=x; b=c; }
  else if (240<=h && h<300){ r=x; g=0; b=c; }
  else { r=c; g=0; b=x; }
  r = Math.round((r+m)*255);
  g = Math.round((g+m)*255);
  b = Math.round((b+m)*255);
  return [r,g,b];
}
function rgbToHex([r,g,b]){ const h=n=>('0'+n.toString(16)).slice(-2); return `#${h(r)}${h(g)}${h(b)}`; }

/** 应用固定HSB主题到 CSS 变量 + LocalStorage */
function applyFixedHSBTheme(){
  try{
    if (!THEME_FIXED_HSB || !THEME_FIXED_HSB.enabled) return;
    const mainRGB = hsvToRgb(THEME_FIXED_HSB.h, THEME_FIXED_HSB.s, THEME_FIXED_HSB.b);
    const secRGB  = hsvToRgb(THEME_FIXED_HSB.h, THEME_FIXED_HSB.s, Math.round(THEME_FIXED_HSB.b*0.85));
    const mainHex = rgbToHex(mainRGB);
    const secHex  = rgbToHex(secRGB);
    const root = document.documentElement;
    root.style.setProperty('--theme-main', mainHex);
    root.style.setProperty('--theme-secondary', secHex);
    localStorage.setItem(LS_KEY.THEME, JSON.stringify({ main: mainHex, secondary: secHex, ver: `fixed-hsb-${THEME_FIXED_HSB.h}-${THEME_FIXED_HSB.s}-${THEME_FIXED_HSB.b}` }));
  }catch(e){}
}

/*********** 会话存取 ***********/
function saveSession(addr, chainId){
  localStorage.setItem(LS_KEY.SESSION, JSON.stringify({ addr, chainId, ts: Date.now() }));
}
function loadSession(){ try { return JSON.parse(localStorage.getItem(LS_KEY.SESSION)); } catch(e){ return null; } }
function clearSession(){ localStorage.removeItem(LS_KEY.SESSION); }
function isSessionFresh(sess){ return !!(sess && typeof sess.ts === "number" && (Date.now() - sess.ts) <= SESSION_TTL_MS); }

/*********** Provider 与网络 ***********/
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

/*********** 弹窗（沿用） ***********/
let __noticeEl = null;
function getNoticeEl(){
  if (__noticeEl) return __noticeEl;
  const el = document.createElement('div');
  el.className = 'notice';
  el.id = 'notice';
  el.style.top = '12vh';
  el.style.transform = 'translateX(-50%) translateY(-16px)';
  document.body.appendChild(el);
  __noticeEl = el;
  return el;
}
function showNotice(msg, type='info', duration=3000, delay=0){
  const el = getNoticeEl();
  el.classList.remove('warn','success','error');
  if (type==='warn') el.classList.add('warn');
  else if (type==='success') el.classList.add('success');
  else if (type==='error') el.classList.add('error');
  el.textContent = msg;

  const card = document.getElementById('loginCard');
  let targetTop = 100;
  try{
    if (card){
      const rect = card.getBoundingClientRect();
      const h = el.offsetHeight || 44;
      targetTop = Math.max(12, rect.top - h - 12);
    }
  }catch(e){}
  el.style.top = (targetTop - 16) + 'px';
  el.style.opacity = '0';
  el.classList.remove('show');

  clearTimeout(el.__timerIn); clearTimeout(el.__timerOut);
  el.__timerIn = setTimeout(()=>{
    el.style.top = targetTop + 'px';
    el.style.transform = 'translateX(-50%) translateY(0)';
    el.classList.add('show');
    el.__timerOut = setTimeout(()=>{
      el.classList.remove('show');
      el.style.transform = 'translateX(-50%) translateY(-8px)';
      el.style.opacity = '0';
    }, duration);
  }, delay);
}

/*********** 连接钱包（登录页） ***********/
async function connectWallet(){
  showNotice('正在发起连接钱包，请在钱包中确认…', 'info', 2500, 0);

  const status = document.getElementById("status");
  const say = (t)=>{ if(status) status.textContent = "状态：" + t; };
  if (!window.ethereum) {
    say("未检测到钱包，请在 MetaMask/OKX 钱包内置浏览器打开");
    showNotice('未检测到钱包，请用钱包内置浏览器打开（仅支持 BSC）', 'warn', 3500, 0);
    return;
  }
  try {
    let accounts = [];
    if (typeof window.ethereum.request === "function") {
      accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    } else {
      const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      accounts = await provider.send("eth_requestAccounts", []);
    }
    if (!accounts || !accounts.length) {
      say("未获取到账户");
      showNotice('未授权账户，请在钱包里同意授权', 'warn', 3000, 0);
      return;
    }

    let chainIdHex = await getChainIdHex();
    if (!chainIdHex || chainIdHex.toLowerCase() !== SUPPORTED_CHAIN_HEX.toLowerCase()) {
      say("请切换到 BSC 主网后重试");
      showNotice('请切换到 BSC 主网（56）后重试', 'warn', 3200, 0);
      return;
    }
    const addr = accounts[0];
    say("已连接 " + addr.slice(0,6) + "..." + addr.slice(-4));
    showNotice('连接成功，正在进入首页…', 'success', 1500, 0);
    saveSession(addr, SUPPORTED_CHAIN_HEX);
    setTimeout(()=> window.location.href = "home.html", 600);
  } catch (err) {
    const msg = err && (err.message || err.reason) ? (err.message || err.reason) : String(err);
    const code = err && err.code ? ` (code:${err.code})` : "";
    if (status) status.textContent = "状态：连接失败 - " + msg + code;
    showNotice('连接失败：' + msg, 'error', 3800, 0);
  }
}

/*********** 页面守卫 ***********/
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
  if (current !== String(sess.addr||"").toLowerCase()) return { ok:false, reason:"addr-mismatch" };
  return { ok:true };
}
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

/*********** 登录页守卫 ***********/
async function guardLoginPage(){
  const result = await verifySessionStrict();
  if (result.ok) { window.location.href = "home.html"; return; }
  const btn = document.getElementById("connectBtn");
  if (btn) btn.onclick = connectWallet;
  setTimeout(()=> showNotice('仅支持 BSC 主网，请使用钱包内置浏览器连接', 'info', 3000, 0), 1000);
}

/*********** 应用页守卫（首页） ***********/
async function guardAppPage(){
  const result = await verifySessionStrict();
  if (!result.ok) { clearSession(); window.location.href = "index.html"; return; }
  const sess = loadSession();
  const addrEl = document.getElementById("addrLine"); if (addrEl) addrEl.textContent = "地址：" + sess.addr;
  const netEl  = document.getElementById("netLine");  if (netEl)  netEl.textContent  = "网络：BSC（56）";
  const guardEl= document.getElementById("guardLine"); if (guardEl) guardEl.textContent= "守卫：已生效";
  attachProviderGuards();
  setInterval(async ()=>{
    const ok = await verifySessionStrict();
    if (!ok.ok) { clearSession(); window.location.href = "index.html"; }
  }, 15000);
}

/*********** ===== 自动 LQ：主题色生成内联 SVG ===== ***********/
function getThemeColors(){
  try{
    const obj = JSON.parse(localStorage.getItem(LS_KEY.THEME) || 'null');
    const css = getComputedStyle(document.documentElement);
    const main = (obj && obj.main) || css.getPropertyValue('--theme-main') || '#0571FF';
    const secondary = (obj && obj.secondary) || css.getPropertyValue('--theme-secondary') || '#0058E6';
    return { main: String(main).trim(), secondary: String(secondary).trim() };
  }catch(e){ return { main:'#0571FF', secondary:'#0058E6' }; }
}
function buildLQDataURL(){
  const { main, secondary } = getThemeColors();
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0%' stop-color='${main}'/><stop offset='100%' stop-color='${secondary}'/>` +
    `</linearGradient></defs>` +
    `<rect width='100%' height='100%' fill='url(#g)'/></svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

/*********** 渐进式背景加载（改：支持 lqSrc="auto"） ***********/
function createBgLQEl(){
  let el = document.getElementById('bgLQ');
  if (!el){
    el = document.createElement('div');
    el.id = 'bgLQ';
    el.className = 'bg-lq';
    document.body.appendChild(el);
  }
  return el;
}
function setBg(el, url){ el.style.backgroundImage = `url("${url}")`; }
function preloadImage(url){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.decoding = 'async'; img.loading = 'eager'; img.setAttribute && img.setAttribute('fetchpriority','high');
    img.onload = ()=> resolve(url);
    img.onerror = ()=> reject(new Error('load failed: '+url));
    img.src = url;
  });
}
async function loadBackgroundProgressive(){
  try{
    const bgHi = document.getElementById("bg");
    if (!bgHi) return;

    // 1) 低清层：若 lqSrc='auto' 则用主题色生成 SVG；否则用配置地址
    if (BG_PROGRESSIVE && BG_PROGRESSIVE.useLQ){
      const lqEl = createBgLQEl();
      const lqUrl = (BG_PROGRESSIVE.lqSrc === 'auto') ? buildLQDataURL() : BG_PROGRESSIVE.lqSrc;
      setBg(lqEl, lqUrl);
      requestAnimationFrame(()=> lqEl.classList.add('show'));
    }

    // 2) 选择高清候选：AVIF → WebP → JPG（任一成功即用）
    const cand = (BG_PROGRESSIVE && Array.isArray(BG_PROGRESSIVE.candidates) ? BG_PROGRESSIVE.candidates : [BG_IMAGE_SRC]).slice();
    let chosen = null;
    for (let i=0;i<cand.length;i++){
      try{ chosen = await preloadImage(cand[i]); break; }catch(e){}
    }
    if (!chosen){ chosen = BG_IMAGE_SRC + (BG_IMAGE_VERSION ? (`?v=${BG_IMAGE_VERSION}`) : ""); }

    // 3) 设置高清并淡入；同时淡出 LQ
    setBg(bgHi, chosen);
    const cross = (BG_PROGRESSIVE && BG_PROGRESSIVE.crossfadeMs) || 260;
    bgHi.style.transitionDuration = cross + 'ms';
    requestAnimationFrame(()=> bgHi.classList.add('show'));

    const lqEl = document.getElementById('bgLQ');
    if (lqEl){
      lqEl.style.transitionDuration = cross + 'ms';
      setTimeout(()=>{ lqEl.classList.remove('show'); }, Math.max(0, cross-30));
    }
  }catch(e){ /* 忽略错误，不影响功能 */ }
}

/*********** Service Worker 注册（沿用） ***********/
function registerSW(){
  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js?v='+APP_VERSION).catch(()=>{});
  }
}

/*********** 背景入口 ***********/
function loadAndApplyBackground(){ loadBackgroundProgressive(); }

/*********** 启动 ***********/
document.addEventListener("DOMContentLoaded", ()=>{
  setVersionBadge();
  applyFixedHSBTheme();
  loadAndApplyBackground();
  registerSW();

  const isLogin = location.pathname.endsWith("index.html") || /\/$/.test(location.pathname);
  if (isLogin) guardLoginPage(); else guardAppPage();
});
