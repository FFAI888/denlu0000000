// v1.14 最简测试版本：只负责连接钱包
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("connectWalletBtn");
  if (!btn) {
    alert("没有找到按钮，请检查 index.html 是否有 id=connectWalletBtn");
    return;
  }

  btn.addEventListener("click", async () => {
    alert("按钮点击事件已触发"); // 一定会弹窗
    console.log("连接钱包按钮被点击");

    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        const account = accounts[0];
        alert("钱包已连接: " + account);
        console.log("钱包已连接:", account);
        // 测试完成后再跳转
        // window.location.href = "home.html?account=" + account;
      } catch (err) {
        alert("连接钱包失败: " + err.message);
        console.error("连接失败:", err);
      }
    } else {
      alert("未检测到 MetaMask，请安装钱包插件");
    }
  });
});
