// v1.01 钱包连接逻辑 + 显示钱包地址
document.addEventListener("DOMContentLoaded", () => {
  const connectWalletBtn = document.getElementById("connectWalletBtn");

  if (connectWalletBtn) {
    connectWalletBtn.addEventListener("click", async () => {
      if (typeof window.ethereum !== "undefined") {
        try {
          // 请求授权
          const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
          const account = accounts[0]; // 获取第一个钱包地址
          
          // 跳转并传递钱包地址
          window.location.href = "home.html?account=" + account;
        } catch (error) {
          alert("连接钱包失败: " + error.message);
        }
      } else {
        alert("未检测到钱包，请安装 MetaMask 插件");
      }
    });
  }
});
