// 版本号：v0.02

const connectButton = document.getElementById("connectButton");
const walletAddress = document.getElementById("walletAddress");

async function connectWallet() {
  if (typeof window.ethereum !== "undefined") {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const account = accounts[0];
      walletAddress.innerText = "已连接钱包地址: " + account;
    } catch (error) {
      console.error(error);
      walletAddress.innerText = "连接失败: " + error.message;
    }
  } else {
    walletAddress.innerText = "请先安装 MetaMask 钱包插件！";
  }
}

connectButton.addEventListener("click", connectWallet);
