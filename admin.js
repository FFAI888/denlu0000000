// v1.56 管理后台：仅管理员可访问
document.addEventListener("DOMContentLoaded", async () => {
  let account = new URLSearchParams(window.location.search).get("account");

  if (!account && window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      account = accounts[0];
    } catch (e) {
      document.getElementById("notice").innerText = "⚠️ 未连接钱包，请先登录！";
      return;
    }
  }

  if (!account) {
    document.getElementById("notice").innerText = "⚠️ 未检测到钱包，请先登录！";
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

  if (!isAdmin) {
    document.getElementById("notice").innerText = "⚠️ 你没有管理员权限";
    return;
  }

  // 管理员进入后台
  document.getElementById("notice").classList.add("hidden");
  document.getElementById("adminPanel").classList.remove("hidden");

  // 展示白名单
  const listEl = document.getElementById("whitelist");
  WHITELIST.forEach(addr => {
    const li = document.createElement("li");
    li.textContent = addr;
    listEl.appendChild(li);
  });
});
