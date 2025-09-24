// v1.00 钱包连接逻辑
document.addEventListener("DOMContentLoaded", () => {
  const connectWalletBtn = document.getElementById("connectWalletBtn");

  if (connectWalletBtn) {
    connectWalletBtn.addEventListener("click", async () => {
      if (typeof window.ethereum !== "undefined") {
        try {
          // 请求钱包授权
          await window.ethereum.request({ method: "eth_requestAccounts" });
          // 跳转到首页
          window.location.href = "home.html";
        } catch (error) {
          alert("连接钱包失败: " + error.message);
        }
      } else {
        alert("未检测到钱包，请安装 MetaMask");
      }
    });
  }
});
