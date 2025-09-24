// v1.61 首页：链上白名单验证 + 行情 + 余额
document.addEventListener("DOMContentLoaded", async () => {
  let account = new URLSearchParams(window.location.search).get("account");
  if (!account && window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      account = accounts[0];
    } catch {
      document.getElementById("loginNotice").innerText = "⚠️ 未连接钱包，请先登录！";
      return;
    }
  }
  if (!account) {
    document.getElementById("loginNotice").innerText = "⚠️ 未检测到钱包，请先登录！";
    return;
  }

  // ✅ 换成你部署的白名单合约地址
  const WHITELIST_CONTRACT = "0xYourWhitelistContract";
  const whitelistAbi = ["function isWhitelisted(address user) view returns (bool)"];

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(WHITELIST_CONTRACT, whitelistAbi, provider);

  const isWhitelisted = await contract.isWhitelisted(account);
  if (!isWhitelisted) {
    document.getElementById("loginNotice").innerText = "⚠️ 你没有访问权限";
    return;
  }

  // 显示内容
  document.getElementById("loginNotice").classList.add("hidden");
  document.getElementById("appContent").classList.remove("hidden");
  document.getElementById("walletAddress").innerText = "钱包地址: " + account;

  // 管理后台入口（可选：在 home.js 检查是否管理员）
  window.goAdmin = function () {
    window.location.href = "admin.html?account=" + account;
  };

  // TODO: 保留原有的行情和余额实时刷新逻辑
});
