// v1.62 首页：整合完成版（链上白名单校验 + 管理员识别 + 价格/余额每秒刷新 + 事件监听 + 调试区仅管理员可见）
document.addEventListener("DOMContentLoaded", async () => {
  // 1) 检测/获取账号
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

  // 2) 白名单合约（请替换为你部署的真正地址）
  const WHITELIST_CONTRACT = "0xYourWhitelistContract";
  const whitelistAbi = [
    "function owner() view returns (address)",
    "function isWhitelisted(address user) view returns (bool)",
    "event Added(address indexed user)",
    "event Removed(address indexed user)"
  ];

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner(); // 仅用于可能的签名交互；本页只读即可
  const whitelist = new ethers.Contract(WHITELIST_CONTRACT, whitelistAbi, provider);

  // 3) 白名单校验
  const allowed = await whitelist.isWhitelisted(account);
  if (!allowed) {
    document.getElementById("loginNotice").innerText = "⚠️ 你没有访问权限";
    return;
  }

  // 4) 管理员识别（owner）
  let isAdmin = false;
  try {
    const owner = await whitelist.owner();
    isAdmin = owner.toLowerCase() === account.toLowerCase();
  } catch {}

  // 5) 解锁页面显示
  document.getElementById("loginNotice").classList.add("hidden");
  document.getElementById("appContent").classList.remove("hidden");
  document.getElementById("walletAddress").innerText = "钱包地址: " + account;

  // 管理员才显示调试与后台入口
  const debugTitleEl = document.getElementById("debugTitle");
  const debugEl = document.getElementById("debug");
  const adminBtn = document.getElementById("adminBtn");
  if (isAdmin) {
    debugTitleEl.classList.remove("hidden");
    debugEl.classList.remove("hidden");
    adminBtn.classList.remove("hidden");
  }

  // 6) 常量：代币 & 池子地址
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
    if (!isAdmin) return; // 仅管理员可见日志
    const now = new Date().toLocaleTimeString();
    debugEl.textContent += `\n[${now}] ${msg}`;
  }

  // 7) 进入后台
  window.goAdmin = function () {
    window.location.href = "admin.html?account=" + account;
  };

  // 8) 价格工具：从池子读取 quote/base
  async function getPairPrice(pairAddress, baseToken, quoteToken) {
    try {
      const pair = new ethers.Contract(pairAddress, pairAbi, provider);
      const token0 = (await pair.token0()).toLowerCase();
      const token1 = (await pair.token1()).toLowerCase();
      const reserves = await pair.getReserves();

      let price = null;
      if (token0 === baseToken && token1 === quoteToken) {
        price = reserves[1] / reserves[0]; // quote/base
      } else if (token0 === quoteToken && token1 === baseToken) {
        price = reserves[0] / reserves[1]; // quote/base
      } else {
        logDebug(`池子不匹配: ${pairAddress} token0=${token0} token1=${token1}`);
      }
      if (price) logDebug(`✅ 链上验证成功: ${pairAddress} 价格=${price}`);
      return price;
    } catch (e) {
      logDebug(`价格查询失败(${pairAddress}): ${e.message}`);
      return null;
    }
  }

  async function refreshPrices() {
    const rongUsd = await getPairPrice(RONG_USDT_PAIR, RONG_TOKEN, USDT_TOKEN);
    if (rongUsd) {
      document.getElementById("price").innerText =
        `RongChain/USDT 当前价格: $${rongUsd.toFixed(6)}`;
    }

    const rongCrc = await getPairPrice(RONG_CRC_PAIR, RONG_TOKEN, CRC_TOKEN);
    if (rongUsd && rongCrc) {
      const crcUsd = rongUsd / rongCrc;
      document.getElementById("crcPrice").innerText =
        `CRC/USDT 当前价格: $${crcUsd.toFixed(6)}`;
      logDebug(`CRC/USDT 价格推算 = RONG/USDT ÷ RONG/CRC = ${crcUsd}`);
    }
  }

  async function fetchBalance(tokenAddr, labelId, labelName) {
    try {
      const token = new ethers.Contract(tokenAddr, erc20Abi, provider);
      const decimals = await token.decimals();
      const symbol = await token.symbol();
      const raw = await token.balanceOf(account);
      const fmt = ethers.utils.formatUnits(raw, decimals);
      document.getElementById(labelId).innerText =
        `${labelName} 余额: ${parseFloat(fmt).toFixed(4)} ${symbol}`;
      logDebug(`✅ ${labelName} 余额链上验证: ${fmt} ${symbol}`);
    } catch (e) {
      document.getElementById(labelId).innerText = `${labelName}余额获取失败`;
      logDebug(`${labelName} 余额查询出错: ${e.message}`);
    }
  }

  // 9) 每秒刷新 价格 + 余额（与旧版一致，不做减少）
  refreshPrices();
  fetchBalance(RONG_TOKEN, "rongBalance", "RongChain");
  fetchBalance(CRC_TOKEN,  "crcBalance", "CRC");
  setInterval(() => {
    refreshPrices();
    fetchBalance(RONG_TOKEN, "rongBalance", "RongChain");
    fetchBalance(CRC_TOKEN,  "crcBalance", "CRC");
  }, 1000);

  // 10) 事件监听：自己被加/移出白名单则即时锁/解锁
  try {
    whitelist.on("Added", (user) => {
      if (user.toLowerCase() === account.toLowerCase()) {
        alert("✅ 你已被加入白名单，功能已解锁");
        // 已在白名单，无需额外动作
      }
    });
    whitelist.on("Removed", (user) => {
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
