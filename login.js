// v1.51 登录页：连接钱包并跳转首页
async function connectWallet() {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const account = accounts[0];
      // 跳转到首页并带上地址
      window.location.href = "home.html?account=" + account;
    } catch (e) {
      alert("连接钱包失败: " + e.message);
    }
  } else {
    alert("请安装 MetaMask 钱包");
  }
}
