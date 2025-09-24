// v1.24 登录页逻辑：只负责连接钱包
document.addEventListener("DOMContentLoaded", () => {
  const connectWalletBtn = document.getElementById("connectWalletBtn");
  if (!connectWalletBtn) {
    alert("没有找到连接钱包按钮");
    return;
  }

  connectWalletBtn.addEventListener("click", async () => {
    alert("按钮点击事件已触发");
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        const account = accounts[0];
        alert("钱包已连接: " + account);
        window.location.href = "home.html?account=" + account;
      } catch (err) {
        alert("连接钱包失败: " + err.message);
      }
    } else {
      alert("未检测到 MetaMask，请安装钱包插件");
    }
  });
});
