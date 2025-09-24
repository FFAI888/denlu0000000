// v1.56 首页：管理员入口
document.addEventListener("DOMContentLoaded", async () => {
  let account = new URLSearchParams(window.location.search).get("account");

  if (!account && window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      account = accounts[0];
    } catch (e) {
      document.getElementById("loginNotice").innerText = "⚠️ 未连接钱包，请先登录！";
      return;
    }
  }

  if (!account) {
    document.getElementById("loginNotice").innerText = "⚠️ 未检测到钱包，请先登录！";
    return;
  }

  // 权限配置
  const ADMIN_LIST = [
    "0x1234567890abcdef1234567890abcdef12345678"
  ].map(addr => addr.toLowerCase());

  const WHITELIST = [
    "0x1234567890abcdef1234567890abcdef12345678", 
    "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
  ].map(addr => addr.toLowerCase());

  const isAdmin = ADMIN_LIST.includes(account.toLowerCase());
  const isWhitelisted = WHITELIST.includes(account.toLowerCase());

  if (!isWhitelisted) {
    document.getElementById("loginNotice").innerText = "⚠️ 你没有访问权限";
    return;
  }

  // 显示页面
  document.getElementById("loginNotice").classList.add("hidden");
  document.getElementById("appContent").classList.remove("hidden");
  document.getElementById("walletAddress").innerText = "钱包地址: " + account;

  // 管理员显示后台入口 & 调试框
  if (isAdmin) {
    document.getElementById("adminBtn").classList.remove("hidden");
    document.getElementById("debugTitle").classList.remove("hidden");
    document.getElementById("debug").classList.remove("hidden");
  }

  // 进入后台
  window.goAdmin = function () {
    window.location.href = "admin.html?account=" + account;
  };

  // ===== 保持 v1.55 链上验证逻辑 =====
  // ... （保持原来的价格 + 余额刷新逻辑不变）
});
