// v1.61 管理后台：链上白名单 + 历史记录 + 时间戳
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

  // ✅ 换成你部署的合约地址
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

  // 检查管理员
  const owner = await contract.owner();
  if (owner.toLowerCase() !== account.toLowerCase()) {
    document.getElementById("notice").innerText = "⚠️ 你没有管理员权限";
    return;
  }

  // 显示后台
  document.getElementById("notice").classList.add("hidden");
  document.getElementById("adminPanel").classList.remove("hidden");

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

  async function loadLogs() {
    const logsEl = document.getElementById("logs");
    logsEl.innerHTML = "加载中...";
    try {
      const addedEvents = await contract.queryFilter(contract.filters.Added(), -5000);
      const removedEvents = await contract.queryFilter(contract.filters.Removed(), -5000);

      const allEvents = [
        ...addedEvents.map(e => ({ type: "添加", user: e.args[0], block: e.blockNumber })),
        ...removedEvents.map(e => ({ type: "移除", user: e.args[0], block: e.blockNumber }))
      ].sort((a, b) => b.block - a.block);

      logsEl.innerHTML = "";
      for (const ev of allEvents) {
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

  loadLogs();
});
