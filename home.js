// v1.66 首页：完整版（白名单校验 + 地址检测 + 行情 + 余额 + 事件监听）
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

  // ✅ 新的白名单合约地址
  const WHITELIST_CONTRACT = "0xEcF7092d409F96C9702F5c4701af760D65F364E5";
  const whitelistAbi = [
    "function owner() view returns (address)",
    "function isWhitelisted(address user) view returns (bool)",
    "event Added(address indexed user)",
    "event Removed(address indexed user)"
  ];

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(WHITELIST_CONTRACT, whitelistAbi, provider);

  // 🚨 地址有效性检测
  try {
    await contract.owner();
  } catch {
    document.getElementById("loginNotice").innerText = "❌ 白名单合约地址无效，请检查配置";
    return;
  }

  // 白名单校验
  const allowed = await contract.isWhitelisted(account);
  if (!allowed) {
    document.getElementById("loginNotice").innerText = "⚠️ 你没有访问权限";
    return;
  }

  // 管理员判断
  let isAdmin = false;
  const owner = await contract.owner();
  if (owner.toLowerCase() === account.toLowerCase()) {
    isAdmin = true;
  }

  // 显示页面
  document.getElementById("loginNotice").classList.add("hidden");
  document.getElementById("appContent").classList.remove("hidden");
  document.getElementById("walletAddress").innerText = "钱包地址: " + account;

  if (isAdmin) {
    document.getElementById("debugTitle").classList.remove("hidden");
    document.getElementById("debug").classList.remove("hidden");
    document.getElementById("adminBtn").classList.remove("hidden");
  }

  // 按钮跳后台
  window.goAdmin = function () {
    window.location.href = "admin.html?account=" + account;
  };

  // ================== 代币与池子配置 ==================
  const RONG_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e".toLowerCase();
  const CRC_TOKEN  = "0x5b2fe2b06e714b7bea4fd35b428077d850c48087".toLowerCase();
  const USDT_TOKEN = "0x55d398326f99059ff775485246999027b3197955".toLowerCase();

  const RONG_USDT_PAIR = "0x7f20dE20b53b8145F75F7a7Bc55CC90AEFEeb795";
  const RONG_CRC_PAIR  = "0x8cDb69f2dDE96fB98FB5AfA6eB553eaB308D16a5";

  const pairAbi = [
    "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function token0() view returns (address)",
    "function token1() view returns (address)"
  ];
  const erc20Abi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
  ];

  function logDebug(msg) {
    if (!isAdmin) return;
    const now = new Date().toLocaleTimeString();
    document.getElementById("debug").textContent += `\n[${now}] ${msg}`;
  }

  // ================ 行情逻辑 ==================
  async function getPairPrice(pairAddress, baseToken, quoteToken) {
    try {
      const pair = new ethers.Contract(pairAddress, pairAbi, provider);
      const token0 = (await pair.token0()).toLowerCase();
      const token1 = (await pair.token1()).toLowerCase();
      const reserves = await pair.getReserves();

      if (token0 === baseToken && token1 === quoteToken) {
        return reserves[1] / reserves[0];
      } else if (token0 === quoteToken && token1 === baseToken) {
        return reserves[0] / reserves[1];
      } else {
        logDebug(`池子不匹配: ${pairAddress}`);
      }
    } catch (e) {
      logDebug(`价格查询失败(${pairAddress}): ${e.message}`);
    }
    return null;
  }

  async function refreshPrices() {
    const rongUsd = await getPairPrice(RONG_USDT_PAIR, RONG_TOKEN, USDT_TOKEN);
    if (rongUsd) {
      document.getElementById("price").innerText = `RongChain/USDT 当前价格: $${rongUsd.toFixed(6)}`;
    }
    const rongCrc = await getPairPrice(RONG_CRC_PAIR, RONG_TOKEN, CRC_TOKEN);
    if (rongUsd && rongCrc) {
      const crcUsd = rongUsd / rongCrc;
      document.getElementById("crcPrice").innerText = `CRC/USDT 当前价格: $${crcUsd.toFixed(6)}`;
    }
  }

  // ================ 余额逻辑 ==================
  async function fetchBalance(tokenAddr, labelId, labelName) {
    try {
      const token = new ethers.Contract(tokenAddr, erc20Abi, provider);
      const decimals = await token.decimals();
      const symbol = await token.symbol();
      const raw = await token.balanceOf(account);
      const fmt = ethers.utils.formatUnits(raw, decimals);
      document.getElementById(labelId).innerText =
        `${labelName} 余额: ${parseFloat(fmt).toFixed(4)} ${symbol}`;
    } catch (e) {
      document.getElementById(labelId).innerText = `${labelName}余额获取失败`;
    }
  }

  // 每秒刷新
  refreshPrices();
  fetchBalance(RONG_TOKEN, "rongBalance", "RongChain");
  fetchBalance(CRC_TOKEN, "crcBalance", "CRC");
  setInterval(() => {
    refreshPrices();
    fetchBalance(RONG_TOKEN, "rongBalance", "RongChain");
    fetchBalance(CRC_TOKEN, "crcBalance", "CRC");
  }, 1000);

  // ================ 白名单事件监听 ==================
  try {
    contract.on("Added", (user) => {
      if (user.toLowerCase() === account.toLowerCase()) {
        alert("✅ 你已被加入白名单，功能已解锁");
      }
    });
    contract.on("Removed", (user) => {
      if (user.toLowerCase() === account.toLowerCase()) {
        alert("⚠️ 你已被移出白名单，功能将锁定");
        document.getElementById("appContent").classList.add("hidden");
        const notice = document.getElementById("loginNotice");
        notice.classList.remove("hidden");
        notice.innerText = "⚠️ 你没有访问权限";
      }
    });
  } catch (e) {
    logDebug("事件监听失败: " + e.message);
  }
});
