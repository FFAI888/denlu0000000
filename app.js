// version: v1.1

async function connectWallet() {
  const status = document.getElementById("status");

  if (!window.ethereum) {
    status.textContent = "状态：未检测到钱包环境，请安装 MetaMask 或在钱包内置浏览器打开";
    return;
  }

  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");

    // 请求账户
    const accounts = await provider.send("eth_requestAccounts", []);
    if (!accounts || accounts.length === 0) {
      status.textContent = "状态：未检测到账户";
      return;
    }

    const addr = accounts[0];
    status.textContent = "状态：已连接 " + addr;
    localStorage.setItem("sessionAddr", addr);
    window.location.href = "home.html";
  } catch (err) {
    console.error("连接失败:", err);
    status.textContent = "状态：连接失败 - " + (err.message || err);
  }
}

function logout(){
  localStorage.removeItem("sessionAddr");
  window.location.href = "index.html";
}

window.addEventListener("DOMContentLoaded", ()=>{
  const path = window.location.pathname;
  if(path.endsWith("index.html") || path.endsWith("/")){
    const btn = document.getElementById("connectBtn");
    if(btn) {
      btn.onclick = connectWallet;
      document.getElementById("status").textContent = "状态：按钮绑定成功，等待点击";
    }
  }
  if(path.endsWith("home.html")){
    const addr = localStorage.getItem("sessionAddr");
    if(!addr){
      window.location.href="index.html";
    } else {
      document.getElementById("addrLine").textContent = "地址：" + addr;
    }
  }
});
