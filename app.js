// version: v1.0

/*********** 工具：版本徽标 ***********/
function setVersionBadge(){
  const el = document.getElementById("verBadge");
  if (el && typeof APP_VERSION === "string") el.textContent = APP_VERSION;
}

/*********** 工具：本地会话 ***********/
function saveSession(addr, chainId){
  localStorage.setItem(LS_KEY.SESSION, JSON.stringify({ addr, chainId, ts: Date.now() }));
}
function loadSession(){
  try { return JSON.parse(localStorage.getItem(LS_KEY.SESSION)); } catch(e){ return null; }
}
function clearSession(){
  localStorage.removeItem(LS_KEY.SESSION);
}

/*********** 核心：连接钱包 ***********/
async function connectWallet(){
  const status = document.getElementById("status");
  const say = (t)=>{ if(status) status.textContent = "状态：" + t; };

  if (!window.ethereum) {
    say("未检测到钱包，请在 MetaMask/OKX 钱包内置浏览器打开");
    return;
  }

  try {
    // 请求账户（优先新 API）
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

    if (chainIdHex.toLowerCase() !== SUPPORTED_CHAIN_HEX.toLowerCase()) {
      say("请切换到 BSC 主网后重试");
      return;
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
function logout(){
  clearSession();
  window.location.href = "index.html";
}

/*********** 守卫与事件 ***********/
function attachProviderGuards(){
  if (!window.ethereum) return;

  // 账户切换：非当前会话或为空 → 退出
  window.ethereum.on?.("accountsChanged", (accs)=>{
    const sess = loadSession();
    const current = accs && accs[0] ? accs[0].toLowerCase() : "";
    const valid = sess && sess.addr && sess.addr.toLowerCase() === current;
    if (!current || !valid) {
      clearSession();
      window.location.href = "index.html";
    }
  });

  // 网络切换：非 BSC → 退出
  window.ethereum.on?.("chainChanged", (cid)=>{
    if (!cid || cid.toLowerCase() !== SUPPORTED_CHAIN_HEX.toLowerCase()) {
      clearSession();
      window.location.href = "index.html";
    }
  });
}

function guardLoginPage(){
  const sess = loadSession();
  if (sess && sess.addr && sess.chainId?.toLowerCase() === SUPPORTED_CHAIN_HEX.toLowerCase()) {
    // 已登录直接进首页，防止重复登录
    window.location.href = "home.html";
    return;
  }
  // 绑定按钮
  const btn = document.getElementById("connectBtn");
  if (btn) btn.onclick = connectWallet;
}

function guardHomePage(){
  const sess = loadSession();
  const addrLine = document.getElementById("addrLine");
  const netLine  = document.getElementById("netLine");
  const guardLine= document.getElementById("guardLine");

  if (!sess || !sess.addr || !sess.chainId || sess.chainId.toLowerCase() !== SUPPORTED_CHAIN_HEX.toLowerCase()) {
    window.location.href = "index.html";
    return;
  }
  if (addrLine) addrLine.textContent = "地址：" + sess.addr;
  if (netLine)  netLine.textContent  = "网络：BSC (56)";
  if (guardLine)guardLine.textContent= "守卫：已开启（账户/网络变更将强制退出）";

  // 挂事件守卫
  attachProviderGuards();
}

/*********** 启动 ***********/
window.addEventListener("DOMContentLoaded", ()=>{
  setVersionBadge();

  const p = location.pathname;
  if (p.endsWith("/") || p.endsWith("index.html")) guardLoginPage();
  if (p.endsWith("home.html")) guardHomePage();
});
