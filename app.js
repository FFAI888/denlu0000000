// Toast
function showToast(msg, type="info") {
  const box = document.getElementById("toastBox");
  if(!box) return;
  const div = document.createElement("div");
  div.className = "toast";
  div.textContent = msg;
  box.appendChild(div);
  setTimeout(()=>div.remove(), toastDuration);
}

// 会话管理
function saveSession(addr){
  localStorage.setItem("session", JSON.stringify({ addr, ts: Date.now() }));
}
function loadSession(){
  const s = localStorage.getItem("session");
  return s ? JSON.parse(s) : null;
}
function clearSession(){
  localStorage.removeItem("session");
}

// 登录
async function connectWallet(){
  if(!window.ethereum){ showToast("请安装钱包","error"); return; }
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const net = await provider.getNetwork();
  if(net.chainId !== SUPPORTED_CHAIN_DEC){
    showToast("请切换到BSC主网","error"); return;
  }
  const accounts = await provider.send("eth_requestAccounts",[]);
  const addr = accounts[0];
  saveSession(addr);
  showToast("连接成功","success");
  window.location.href="home.html";
}
async function logout(){
  clearSession();
  showToast("已退出");
  window.location.href="index.html";
}

// 守卫
async function guardLogin(){
  const s = loadSession();
  if(s) window.location.href="home.html";
  const btn = document.getElementById("connectBtn");
  if(btn) btn.onclick = connectWallet;
}
async function guardHome(){
  const s = loadSession();
  if(!s){ showToast("请登录"); window.location.href="index.html"; return; }
  document.getElementById("addrLine").textContent = "地址：" + s.addr;
  document.getElementById("netLine").textContent = "网络：BSC";
  document.getElementById("sessionLine").textContent = "会话有效";
}

// 初始化
window.addEventListener("DOMContentLoaded", ()=>{
  const path = window.location.pathname;
  if(path.endsWith("/") || path.endsWith("index.html")) guardLogin();
  if(path.endsWith("home.html")) guardHome();
});
