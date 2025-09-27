// version: v1.00

/*********** 版本徽标 ***********/
function setVersionBadge(){
  const el = document.getElementById("verBadge");
  if (el && typeof APP_VERSION === "string") el.textContent = APP_VERSION;
}

/*********** 文件名旁提示：文件名（版本，修改的/未修改的） ***********/
function renderCurrentFileStatusChip(){
  try{
    const current = (location.pathname.split('/').pop() || 'index.html');
    const list = (typeof CHANGE_LOG !== 'undefined' && Array.isArray(CHANGE_LOG)) ? CHANGE_LOG : [];
    const meta = list.find(x => String(x.file||'') === current);
    const ver = meta ? (meta.ver || APP_VERSION) : APP_VERSION;
    const tag = meta ? (meta.status === '已修改' ? '修改的' : '未修改的') : '未标注的';

    let chip = document.getElementById("fileStatusMini");
    if (!chip){
      chip = document.createElement("span");
      chip.id = "fileStatusMini";
      chip.className = "file-status-mini";
      document.body.appendChild(chip);
    }
    chip.textContent = `${current}（${ver}，${tag}）`;
  }catch(e){ console.warn("renderCurrentFileStatusChip error:", e); }
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
    // 跳首页
    window.location.href = "home.html";
  } catch (err) {
    const msg = err && (err.message || err.reason) ? (err.message || err.reason) : String(err);
    const code = err && err.code ? ` (code:${err.code})` : "";
    if (status) status.textContent = "状态：连接失败 - " + msg + code;
  }
}

/*********** 退出登录 ***********/
function logout(){ clearSession(); window.location.href = "index.html"; }

/*********** 页面守卫：必须已登录 + 主网 + 同地址 ***********/
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

/*********** 监听切换账号/网络，强制退出 ***********/
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
}

/*********** 应用页守卫（首页） ***********/
async function guardAppPage(){
  const result = await verifySessionStrict();
  if (!result.ok) { clearSession(); window.location.href = "index.html"; return; }
  const sess = loadSession();
  // 填充用户信息
  const addrEl = document.getElementById("addrLine");
  if (addrEl) addrEl.textContent = "地址：" + sess.addr;
  const netEl = document.getElementById("netLine");
  if (netEl) netEl.textContent = "网络：BSC（56）";
  const guardEl = document.getElementById("guardLine");
  if (guardEl) guardEl.textContent = "守卫：已生效";

  attachProviderGuards();
  // 每 15 秒复核一次有效性
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
  renderCurrentFileStatusChip();
  loadAndApplyBackground();

  const isLogin = location.pathname.endsWith("index.html") || /\/$/.test(location.pathname);
  if (isLogin) guardLoginPage(); else guardAppPage();
});
