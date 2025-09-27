// version: v1.03

/*********** 版本徽标 ***********/
function setVersionBadge(){
  const el = document.getElementById("verBadge");
  if (el && typeof APP_VERSION === "string") el.textContent = APP_VERSION;
}

/*********** （已删除）文件修改提示渲染 ***********/
// 按你的要求，彻底移除“文件名（版本，修改的/未修改的）”渲染逻辑与依赖。

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

/*********** 连接钱包（登录页） ***********/
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
    if (!chainIdHex || chainIdHex.toLowerCase() !== SUPPORTED_CHAIN_HEX.toLowerCase()) {
      say("请切换到 BSC 主网后重试"); return;
    }
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

/*********** 退出登录 ***********/
function logout(){ clearSession(); window.location.href = "index.html"; }

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
  const addrEl = document.getElementById("addrLine"); if (addrEl) addrEl.textContent = "地址：" + sess.addr;
  const netEl  = document.getElementById("netLine");  if (netEl)  netEl.textContent  = "网络：BSC（56）";
  const guardEl= document.getElementById("guardLine"); if (guardEl) guardEl.textContent= "守卫：已生效";

  attachProviderGuards();
  setInterval(async ()=>{
    const ok = await verifySessionStrict();
    if (!ok.ok) { clearSession(); window.location.href = "index.html"; }
  }, 15000);
}

/*********** 背景图加载并淡入（可选） ***********/
function loadAndApplyBackground(){
  const bgEl = document.getElementById("bg");
  if (!bgEl) return;
  const img = new Image();
  if (IMAGE_CROSSORIGIN) img.crossOrigin = "anonymous";
  img.onload = function(){
    bgEl.style.backgroundImage = `url("${BG_IMAGE_SRC}")`;
    requestAnimationFrame(()=> bgEl.classList.add("show"));
  };
  img.src = BG_IMAGE_SRC + (BG_IMAGE_VERSION ? (`?v=${BG_IMAGE_VERSION}`) : "");
}

/*********** 启动 ***********/
document.addEventListener("DOMContentLoaded", ()=>{
  setVersionBadge();
  applyFixedHSBTheme();
  loadAndApplyBackground();

  const isLogin = location.pathname.endsWith("index.html") || /\/$/.test(location.pathname);
  if (isLogin) guardLoginPage(); else guardAppPage();
});
