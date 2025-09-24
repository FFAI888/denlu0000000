// v1.67 管理后台：地址检测 + 管理员校验 + 白名单管理 + 日志 + 事件监听
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

  // ✅ 新的白名单合约地址
  const WHITELIST_CONTRACT = "0x8b7D5050725631FFE42c4e2dCfc999c30228b722";
  const abi = [
    "function owner() view returns (address)",
    "function addWhitelist(address user)",
    "function removeWhitelist(address user)",
    "event Added(address indexed user)",
    "event Removed(address indexed user)"
  ];

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const contract = new ethers.Contract(WHITELIST_CONTRACT, abi, signer);

  // 🚨 地址有效性检测
  let owner;
  try {
    owner = await contract.owner();
  } catch {
    document.getElementById("notice").innerText = "❌ 白名单合约地址无效，请检查配置";
    return;
  }

  // 管理员校验
  if (owner.toLowerCase() !== account.toLowerCase()) {
    document.getElementById("notice").innerText = "⚠️ 你没有管理员权限";
    return;
  }

  document.getElementById("notice").classList.add("hidden");
  document.getElementById("adminPanel").classList.remove("hidden");

  // 添加白名单
  window.addWhitelist = async function () {
    const input = document.getElementById("newAddress");
    const addr = input.value.trim();
    if (!ethers.utils.isAddress(addr)) {
      alert("请输入有效的钱包地址！");
      return;
    }
    try {
      const tx = await contract.addWhitelist(addr);
      await tx.wait();
      alert("添加成功！");
      loadLogs();
    } catch (e) {
      alert("添加失败: " + e.message);
    }
  };

  // 实时事件监听
  try {
    contract.on("Added", (user) => {
      alert(`✅ 白名单更新: ${user} 已加入白名单`);
      loadLogsDebounced();
    });
    contract.on("Removed", (user) => {
      alert(`⚠️ 白名单更新: ${user} 已移出白名单`);
      loadLogsDebounced();
    });
  } catch {}

  const logsEl = document.getElementById("logs");

  async function loadLogs() {
    logsEl.innerHTML = "加载中...";
    try {
      const addedEvents = await contract.queryFilter(contract.filters.Added(), -5000);
      const removedEvents = await contract.queryFilter(contract.filters.Removed(), -5000);

      const all = [
        ...addedEvents.map(e => ({ type: "添加", user: e.args[0], block: e.blockNumber })),
        ...removedEvents.map(e => ({ type: "移除", user: e.args[0], block: e.blockNumber }))
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
        div.textContent = `[区块 ${ev.block} | ${ts}] ${ev.type}白名单: ${ev.user}`;
        logsEl.appendChild(div);
      }
    } catch (e) {
      logsEl.innerHTML = "加载失败: " + e.message;
    }
  }

  // 防抖
  let _logsTimer = null;
  function loadLogsDebounced() {
    if (_logsTimer) clearTimeout(_logsTimer);
    _logsTimer = setTimeout(loadLogs, 1000);
  }

  loadLogs();
});
