// v1.72 管理后台：白名单管理 + 转移所有权 + 显示所有白名单用户 + 日志
document.addEventListener("DOMContentLoaded", async () => {
  let account = new URLSearchParams(window.location.search).get("account");
  if (!account && window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      account = accounts[0];
    } catch {
      document.getElementById("notice").innerText = "⚠️ 未连接钱包，请先登录！";
      return;
    }
  }
  if (!account) {
    document.getElementById("notice").innerText = "⚠️ 未检测到钱包，请先登录！";
    return;
  }

  const WHITELIST_CONTRACT = "0x8b7D5050725631FFE42c4e2dCfc999c30228b722";

  const abi = [
    "function owner() view returns (address)",
    "function transferOwnership(address newOwner)",
    "function addWhitelist(address user)",
    "function removeWhitelist(address user)",
    "function isWhitelisted(address user) view returns (bool)",
    "event Added(address indexed user)",
    "event Removed(address indexed user)",
    "event OwnershipTransferred(address indexed oldOwner, address indexed newOwner)"
  ];

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const contract = new ethers.Contract(WHITELIST_CONTRACT, abi, signer);

  let realOwner;
  try {
    realOwner = await contract.owner();
    document.getElementById("ownerInfo").innerText = "合约 Owner: " + realOwner;
  } catch (e) {
    document.getElementById("notice").innerText = "❌ 获取合约 owner 失败: " + e.message;
    return;
  }

  if (account.toLowerCase() !== realOwner.toLowerCase()) {
    document.getElementById("notice").innerText = "⚠️ 你不是当前所有者，没有管理员权限";
    return;
  }

  document.getElementById("notice").classList.add("hidden");
  document.getElementById("adminPanel").classList.remove("hidden");

  // 添加白名单
  window.addWhitelist = async function () {
    const addr = document.getElementById("newAddress").value.trim();
    if (!ethers.utils.isAddress(addr)) {
      alert("请输入有效的钱包地址！");
      return;
    }
    try {
      const tx = await contract.addWhitelist(addr);
      await tx.wait();
      alert("添加成功！");
      loadWhitelist();
      loadLogs();
    } catch (e) {
      alert("添加失败: " + e.message);
    }
  };

  // 移除白名单
  window.removeWhitelist = async function () {
    const addr = document.getElementById("removeAddress").value.trim();
    if (!ethers.utils.isAddress(addr)) {
      alert("请输入有效的钱包地址！");
      return;
    }
    try {
      const tx = await contract.removeWhitelist(addr);
      await tx.wait();
      alert("移除成功！");
      loadWhitelist();
      loadLogs();
    } catch (e) {
      alert("移除失败: " + e.message);
    }
  };

  // 转移所有权
  window.transferOwnership = async function () {
    const newOwner = document.getElementById("newOwner").value.trim();
    if (!ethers.utils.isAddress(newOwner)) {
      alert("请输入有效的新所有者地址！");
      return;
    }
    try {
      const tx = await contract.transferOwnership(newOwner);
      await tx.wait();
      alert("所有权已转移成功！");
      document.getElementById("ownerInfo").innerText = "合约 Owner: " + newOwner;
    } catch (e) {
      alert("转移失败: " + e.message);
    }
  };

  // 显示白名单列表
  async function loadWhitelist() {
    const wlEl = document.getElementById("whitelist");
    wlEl.innerHTML = "加载中...";
    try {
      const addedEvents = await contract.queryFilter(contract.filters.Added(), 0, "latest");
      const removedEvents = await contract.queryFilter(contract.filters.Removed(), 0, "latest");

      const whitelistSet = new Set();
      addedEvents.forEach(e => whitelistSet.add(e.args[0].toLowerCase()));
      removedEvents.forEach(e => whitelistSet.delete(e.args[0].toLowerCase()));

      if (whitelistSet.size === 0) {
        wlEl.innerHTML = "当前白名单为空";
        return;
      }

      wlEl.innerHTML = "";
      whitelistSet.forEach(addr => {
        const div = document.createElement("div");
        div.textContent = addr;
        wlEl.appendChild(div);
      });
    } catch (e) {
      wlEl.innerHTML = "加载失败: " + e.message;
    }
  }

  // 日志显示
  const logsEl = document.getElementById("logs");
  async function loadLogs() {
    logsEl.innerHTML = "加载中...";
    try {
      const addedEvents = await contract.queryFilter(contract.filters.Added(), -5000);
      const removedEvents = await contract.queryFilter(contract.filters.Removed(), -5000);
      const ownershipEvents = await contract.queryFilter(contract.filters.OwnershipTransferred(), -5000);

      const all = [
        ...addedEvents.map(e => ({ type: "添加", user: e.args[0], block: e.blockNumber })),
        ...removedEvents.map(e => ({ type: "移除", user: e.args[0], block: e.blockNumber })),
        ...ownershipEvents.map(e => ({ type: "转移所有权", user: `${e.args[0]} → ${e.args[1]}`, block: e.blockNumber }))
      ].sort((a, b) => b.block - a.block);

      if (all.length === 0) {
        logsEl.innerHTML = "暂无操作记录";
        return;
      }

      logsEl.innerHTML = "";
      for (const ev of all) {
        const block = await provider.getBlock(ev.block);
        const ts = new Date(block.timestamp * 1000).toLocaleString();
        const div = document.createElement("div");
        div.textContent = `[区块 ${ev.block} | ${ts}] ${ev.type}: ${ev.user}`;
        logsEl.appendChild(div);
      }
    } catch (e) {
      logsEl.innerHTML = "加载失败: " + e.message;
    }
  }

  // 监听事件
  try {
    contract.on("Added", (user) => {
      alert(`✅ 白名单更新: ${user} 已加入白名单`);
      loadWhitelist();
      loadLogs();
    });
    contract.on("Removed", (user) => {
      alert(`⚠️ 白名单更新: ${user} 已移出白名单`);
      loadWhitelist();
      loadLogs();
    });
    contract.on("OwnershipTransferred", (oldOwner, newOwner) => {
      alert(`🔑 所有权从 ${oldOwner} 转移到 ${newOwner}`);
      document.getElementById("ownerInfo").innerText = "合约 Owner: " + newOwner;
    });
  } catch (e) {
    console.error("事件监听失败:", e);
  }

  // 初始化
  loadWhitelist();
  loadLogs();
});
