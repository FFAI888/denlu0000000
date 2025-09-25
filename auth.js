// v1.74 全局权限拦截器
async function enforceAuth({ requireAdmin = false } = {}) {
  if (typeof ethers === "undefined") {
    alert("❌ 缺少 ethers.js，请检查配置");
    window.location.href = "index.html";
    return;
  }

  if (!window.ethereum) {
    alert("❌ 没有检测到钱包，请安装 MetaMask");
    window.location.href = "index.html";
    return;
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  if (!accounts || accounts.length === 0) {
    alert("⚠️ 未检测到钱包账户");
    window.location.href = "index.html";
    return;
  }
  const account = accounts[0];

  // 白名单合约
  const WHITELIST_CONTRACT = "0x8b7D5050725631FFE42c4e2dCfc999c30228b722";
  const whitelistAbi = [
    "function owner() view returns (address)",
    "function isWhitelisted(address user) view returns (bool)"
  ];
  const contract = new ethers.Contract(WHITELIST_CONTRACT, whitelistAbi, provider);

  try {
    const allowed = await contract.isWhitelisted(account);
    if (!allowed) {
      alert("⚠️ 你不在白名单，将返回登录页");
      window.location.href = "index.html";
      return;
    }
  } catch (e) {
    alert("❌ 白名单校验失败: " + (e && e.message ? e.message : e));
    window.location.href = "index.html";
    return;
  }

  if (requireAdmin) {
    const owner = await contract.owner();
    if (owner.toLowerCase() !== account.toLowerCase()) {
      alert("⚠️ 你不是管理员，将返回首页");
      window.location.href = "home.html?account=" + account;
      return;
    }
  }

  // ✅ 返回当前账号
  return account;
}
