// v1.51 首页：自动检测钱包地址 + 实时价格余额刷新
document.addEventListener("DOMContentLoaded", async () => {
  let account = new URLSearchParams(window.location.search).get("account");

  if (!account && window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      account = accounts[0];
    } catch (e) {
      alert("未检测到钱包地址，请先连接钱包！");
      return;
    }
  }

  if (!account) {
    document.getElementById("walletAddress").innerText = "钱包地址: 未连接";
    return;
  }

  document.getElementById("walletAddress").innerText = "钱包地址: " + account;

  // 代币合约地址
  const RONG_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e".toLowerCase();
  const CRC_TOKEN  = "0x5b2fe2b06e714b7bea4fd35b428077d850c48087".toLowerCase();
  const USDT_TOKEN = "0x55d398326f99059ff775485246999027b3197955".toLowerCase();

  // 池子合约地址
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

  const debugEl = document.getElementById("debug");
  function logDebug(msg) {
    const now = new Date().toLocaleTimeString();
    debugEl.textContent += `\n[${now}] ${msg}`;
  }

  // ===== 获取池子价格 =====
  async function getPairPrice(pairAddress, baseToken, quoteToken) {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const pair = new ethers.Contract(pairAddress, pairAbi, provider);

      const token0 = (await pair.token0()).toLowerCase();
      const token1 = (await pair.token1()).toLowerCase();
      const reserves = await pair.getReserves();

      let price = null;
      if (token0 === baseToken && token1 === quoteToken) {
        price = reserves[1] / reserves[0]; // quote/base
      } else if (token0 === quoteToken && token1 === baseToken) {
        price = reserves[0] / reserves[1]; // quote/base
      }
      return price;
    } catch (e) {
      logDebug(`价格查询失败: ${e.message}`);
      return null;
    }
  }

  // ===== 刷新价格 =====
  async function refreshPrices() {
    const rongPrice = await getPairPrice(RONG_USDT_PAIR, RONG_TOKEN, USDT_TOKEN);
    if (rongPrice) {
      document.getElementById("price").innerText =
        `RongChain/USDT 当前价格: $${rongPrice.toFixed(6)}`;
      logDebug(`RongChain价格: $${rongPrice.toFixed(6)}`);
    }

    const rongCrc = await getPairPrice(RONG_CRC_PAIR, RONG_TOKEN, CRC_TOKEN);
    if (rongPrice && rongCrc) {
      const crcPrice = rongPrice / rongCrc;
      document.getElementById("crcPrice").innerText =
        `CRC/USDT 当前价格: $${crcPrice.toFixed(6)}`;
      logDebug(`CRC价格: $${crcPrice.toFixed(6)}`);
    }
  }

  // ===== 查询余额 =====
  async function fetchBalance(tokenAddress, labelId, labelName) {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const token = new ethers.Contract(tokenAddress, erc20Abi, provider);

      const decimals = await token.decimals();
      const symbol = await token.symbol();
      const rawBalance = await token.balanceOf(account);
      const formattedBalance = ethers.utils.formatUnits(rawBalance, decimals);

      document.getElementById(labelId).innerText =
        `${labelName} 余额: ${parseFloat(formattedBalance).toFixed(4)} ${symbol}`;
      logDebug(`${labelName}余额: ${formattedBalance} ${symbol}`);
    } catch (e) {
      document.getElementById(labelId).innerText = `${labelName}余额获取失败`;
      logDebug(`${labelName} 余额查询出错: ${e.message}`);
    }
  }

  // ===== 定时刷新（每秒）=====
  setInterval(() => {
    refreshPrices();
    fetchBalance(RONG_TOKEN, "rongBalance", "RongChain");
    fetchBalance(CRC_TOKEN, "crcBalance", "CRC");
  }, 1000);
});
