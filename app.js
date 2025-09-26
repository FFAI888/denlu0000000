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
  console.log("🔍 connectWallet() 被调用"); // 调试日志
  try {
    if(!window.ethereum){ 
      showToast("请安装钱包","error"); 
      return; 
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);

    // 请求账户
    const accounts = await provider.send("eth_requestAccounts",[]);
    console.log("获取到账户:", accounts);
    if(!accounts || accounts.length === 0){
      showToast("未检测到账户","error"); return;
    }

    // 检查网络
    const net = await provider.getNetwork();
    console.log("当前网络:", net);
    if(net.chainId !== SUPPORTED_CHAIN_DEC){
      showToast("请切换到BSC主网","error"); return;
    }

    const addr = accounts[0];
    saveSession(addr);
    showToast("连接成功","success");
    window.location.href="home.html";
  } catch(e) {
    console.error("连接失败:", e);
    showToast("连接失败: " + (e.message || e),"error");
  }
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
  console.log("页面已加载:", window.location.pathname);
  const path = window.location.pathname;

  if(path.endsWith("/") || path.endsWith("index.html")){
    guardLogin();
    const btn = document.getElementById("connectBtn");
    if(btn) {
      console.log("绑定按钮事件成功");
      btn.onclick = connectWallet;
    } else {
      console.log("❌ 没找到按钮 connectBtn");
    }
  }

  if(path.endsWith("home.html")) guardHome();
});
