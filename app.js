async function connectWallet() {
  const status = document.getElementById("status");

  if (!window.ethereum) {
    status.textContent = "状态：请安装钱包（MetaMask/OKX）";
    return;
  }

  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    const addr = accounts[0];
    status.textContent = "状态：已连接 " + addr;
    localStorage.setItem("sessionAddr", addr);
    window.location.href = "home.html";
  } catch (err) {
    status.textContent = "状态：连接失败 - " + err.message;
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
    if(btn) btn.onclick = connectWallet;
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
