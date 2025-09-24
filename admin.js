// v1.62 管理后台：整合完成版（管理员校验 + 链上增删白名单 + 实时事件弹窗 + 历史记录时间戳）
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

  // 白名单合约地址（替换为你的）
  const WHITELIST_CONTRACT = "0xYourWhitelistContract";
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

  // 管理员校验
  const owner = await contract.owner();
  if (owner.toLowerCase() !== account.toLowerCase()) {
    document.getElementById("notice").innerText = "⚠️ 你没有管理员权限";
    return;
  }

  // 显示后台
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

  // 实时事件弹窗
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

  // 历史记录（最近 5000 区块）+ 时间戳
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

  // 简单防抖，避免短时间频繁刷日志
  let _logsTimer = null;
  function loadLogsDebounced() {
    if (_logsTimer) clearTimeout(_logsTimer);
    _logsTimer = setTimeout(loadLogs, 1000);
  }

  loadLogs();
});
