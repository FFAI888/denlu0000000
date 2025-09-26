// version: v1.21

// 统一保存/读取/清理会话
function saveAddr(addr){ localStorage.setItem("sessionAddr", addr); }
function loadAddr(){ return localStorage.getItem("sessionAddr"); }
function clearAddr(){ localStorage.removeItem("sessionAddr"); }

// 兼容多钱包的账户请求（优先 ethereum.request）
async function requestAccountsCompat() {
  if (!window.ethereum) throw new Error("未检测到钱包环境");
  if (typeof window.ethereum.request === "function") {
    // 直接请求（大多数钱包推荐）
    return await window.ethereum.request({ method: "eth_requestAccounts" });
  } else {
    // 兼容旧方式（ethers v5）
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    return await provider.send("eth_requestAccounts", []);
  }
}

async function connectWallet() {
  const status = document.getElementById("status");
  if (status) status.textContent = "状态：正在请求钱包授权…";

  try {
    const accounts = await requestAccountsCompat();
    if (!accounts || !accounts.length) {
      if (status) status.textContent = "状态：没有获取到账户";
      return;
    }
    const addr = accounts[0];
    if (status) status.textContent = "状态：已连接 " + addr;
    saveAddr(addr);
    window.location.href = "home.html";
  } catch (err) {
    // 常见：用户拒绝（Metamask：code=4001）
    const msg = (err && (err.message || err.reason)) ? (err.message || err.reason) : String(err);
    if (status) status.textContent = "状态：连接失败 - " + msg;
  }
}

function logout(){
  clearAddr();
  window.location.href = "index.html";
}

// 页面初始化与守卫
window.addEventListener("DOMContentLoaded", ()=>{
  const path = window.location.pathname;

  // 登录页：绑定按钮
  if (path.endsWith("index.html") || path.endsWith("/")) {
    const btn = document.getElementById("connectBtn");
    if (btn) btn.addEventListener("click", connectWallet, { passive: true });
  }

  // 首页：必须已登录
  if (path.endsWith("home.html")) {
    const addr = loadAddr();
    if (!addr) {
      window.location.href = "index.html";
      return;
    }
    const el = document.getElementById("addrLine");
    if (el) el.textContent = "地址：" + addr;
  }
});
