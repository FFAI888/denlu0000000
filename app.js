// 存储和获取钱包地址
function setWalletAddress(addr){
  localStorage.setItem("walletAddress", addr);
}
function getWalletAddress(){
  return localStorage.getItem("walletAddress");
}

// 连接钱包
async function connectWallet(){
  if(window.ethereum){
    try{
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const addr = await signer.getAddress();

      setWalletAddress(addr);
      const el = document.getElementById("walletAddress");
      if(el) el.innerText = "✅ 已连接: " + addr;

      // 自动跳转首页（只有在 index.html 调用时才生效）
      if(window.location.pathname.includes("index.html")){
        window.location.href = "home.html";
      }
    }catch(e){
      alert("连接失败: " + e.message);
    }
  }else{
    alert("请安装 MetaMask 或支持 Web3 的钱包");
  }
}
