// v1.75 管理后台脚本
// 功能：全局权限拦截、显示管理员提示、白名单管理、所有权转移、事件监听、日志、白名单列表

(async function () {
  "use strict";

  // ===== 全局权限拦截（必须是管理员）=====
  const account = await enforceAuth({ requireAdmin: true });
  if (!account) return;

  // ===== 常量配置 =====
  const WHITELIST_CONTRACT = "0x8b7D5050725631FFE42c4e2dCfc999c30228b722";
  const abi = [
    "function owner() view returns (address)",
    "function isWhitelisted(address user) view returns (bool)",
    "function addWhitelist(address user)",
    "function removeWhitelist(address user)",
    "function transferOwnership(address newOwner)",
    "function getAllWhitelist() view returns (address[] memory, bool[] memory)",
    "event Added(address indexed user)",
    "event Removed(address indexed user)",
    "event OwnershipTransferred(address indexed oldOwner, address indexed newOwner)"
  ];

  // ===== 初始化 Provider & Contract =====
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const contract = new ethers.Contract(WHITELIST_CONTRACT, abi, signer);

  // ===== 页面元素 =====
  const noticeEl = document.getElementById("notice");
  const panelEl = document.getElementById("adminPanel");
  const ownerEl = document.getElementById("ownerInfo");
  const adminNotice = document.getElementById("adminNotice");
  const whitelistDiv = document.getElementById("whitelist");
  const logsDiv = document.getElementById("logs");

  // ===== 显示管理员提示 =====
  try {
    const owner = await contract.owner();
    ownerEl.innerText = "合约 Owner: " + owner;
    if (owner.toLowerCase() === account.toLowerCase()) {
      adminNotice.classList.remove("hidden");
    }
  } catch (e) {
    noticeEl.innerText = "❌ 获取合约 Owner 失败: " + e.message;
    return;
  }

  // ===== 初始化页面 =====
  noticeEl.classList.add("hidden");
  panelEl.classList.remove("hidden");

  // ===== 白名单管理函数 =====
  window.addWhitelist = async () => {
    const addr = document.getElementById("newAddress").value.trim();
    if (!ethers.utils.isAddress(addr)) {
      alert("❌ 地址无效");
      return;
    }
    try {
      const tx = await contract.addWhitelist(addr);
      await tx.wait();
      log(`✅ 已添加白名单: ${addr}`);
      loadWhitelist();
    } catch (e) {
      alert("添加失败: " + e.message);
    }
  };

  window.removeWhitelist = async () => {
    const addr = document.getElementById("removeAddress").value.trim();
    if (!ethers.utils.isAddress(addr)) {
      alert("❌ 地址无效");
      return;
    }
    try {
      const tx = await contract.removeWhitelist(addr);
      await tx.wait();
      log(`⚠️ 已移除白名单: ${addr}`);
      loadWhitelist();
    } catch (e) {
      alert("移除失败: " + e.message);
    }
  };

  window.transferOwnership = async () => {
    const newOwner = document.getElementById("newOwner").value.trim();
    if (!ethers.utils.isAddress(newOwner)) {
      alert("❌ 地址无效");
      return;
    }
    try {
      const tx = await contract.transferOwnership(newOwner);
      await tx.wait();
      log(`🔑 所有权已转移至: ${newOwner}`);
      ownerEl.innerText = "合约 Owner: " + newOwner;
    } catch (e) {
      alert("转移失败: " + e.message);
    }
  };

  // ===== 白名单列表 =====
  async function loadWhitelist() {
    try {
      const [addresses, statuses] = await contract.getAllWhitelist();
      if (!addresses || addresses.length === 0) {
        whitelistDiv.innerText = "⚠️ 白名单为空";
        return;
      }
      let html = "<ul>";
      for (let i = 0; i < addresses.length; i++) {
        html += `<li>${addresses[i]} - ${statuses[i] ? "✅ 已启用" : "❌ 已移除"}</li>`;
      }
      html += "</ul>";
      whitelistDiv.innerHTML = html;
    } catch (e) {
      whitelistDiv.innerText = "❌ 获取白名单失败: " + e.message;
    }
  }

  // ===== 日志输出 =====
  function log(msg) {
    const now = new Date().toLocaleTimeString();
    logsDiv.innerText += `\n[${now}] ${msg}`;
  }

  // ===== 事件监听 =====
  contract.on("Added", (user) => {
    log(`✅ 事件: 地址加入白名单 ${user}`);
    loadWhitelist();
  });
  contract.on("Removed", (user) => {
    log(`⚠️ 事件: 地址移出白名单 ${user}`);
    loadWhitelist();
  });
  contract.on("OwnershipTransferred", (oldOwner, newOwner) => {
    log(`🔑 事件: 所有权转移 ${oldOwner} → ${newOwner}`);
    ownerEl.innerText = "合约 Owner: " + newOwner;
  });

  // ===== 初次加载 =====
  loadWhitelist();
})();
