// version: v1.02

/*********** 版本徽标 ***********/
function setVersionBadge(){
  const el = document.getElementById("verBadge");
  if (el && typeof APP_VERSION === "string") el.textContent = APP_VERSION;
}

/*********** 本地会话 ***********/
function saveSession(addr, chainId){
  localStorage.setItem(LS_KEY.SESSION, JSON.stringify({ addr, chainId, ts: Date.now() }));
}
function loadSession(){
  try { return JSON.parse(localStorage.getItem(LS_KEY.SESSION)); } catch(e){ return null; }
}
function clearSession(){
  localStorage.removeItem(LS_KEY.SESSION);
}

/*********** 连接钱包 ***********/
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

    // 读取网络
    let chainIdHex = "0x0";
    if (typeof window.ethereum.request === "function") {
      chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
    } else {
      const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      const net = await provider.getNetwork();
      chainIdHex = "0x" + net.chainId.toString(16);
    }
    if (chainIdHex.toLowerCase() !== SUPPORTED_CHAIN_HEX.toLowerCase()) { say("请切换到 BSC 主网后重试"); return; }

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
function logout(){
  clearSession();
  window.location.href = "index.html";
}

/*********** Provider 守卫 ***********/
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

/*********** 页面守卫（应用内页面通用） ***********/
function guardAppPage(){
  const sess = loadSession();
  if (!sess || !sess.addr || !sess.chainId || sess.chainId.toLowerCase() !== SUPPORTED_CHAIN_HEX.toLowerCase()) {
    window.location.href = "index.html"; return;
  }
  // 写当前地址（如果页面提供了占位）
  const ids = ["addrLine","addrGroup","addrEarn","addrSwap","addrMine"];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = "地址：" + sess.addr; });

  attachProviderGuards();
}

/*********** 底部导航高亮 ***********/
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
window.addEventListener("DOMContentLoaded", ()=>{
  setVersionBadge();

  const p = location.pathname;
  if (p.endsWith("/") || p.endsWith("index.html")) {
    // 登录页
    const btn = document.getElementById("connectBtn");
    if (btn) btn.onclick = connectWallet;
  } else {
    // 应用内页面（home/group/earn/swap/mine）
    guardAppPage();
    setActiveTabbar();
  }
});
