// v1.44 首页：RongChain + CRC 实时价格 + 余额
document.addEventListener("DOMContentLoaded", async () => {
  const account = new URLSearchParams(window.location.search).get("account");
  if (!account) return;

  // 代币 & 池子地址
  const RONG_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e".toLowerCase();
  const CRC_TOKEN  = "0x8cDb69f2dDE96fB98FB5AfA6eB553eaB308D16a5".toLowerCase(); // 你提供的 CRC 池子 token 地址（注意：如果这是池子地址，就不能查余额，需要 CRC 的合约地址）
  const USDT_TOKEN = "0x55d398326f99059ff775485246999027b3197955".toLowerCase();

  const RONG_PAIR = "0x7f20dE20b53b8145F75F7a7Bc55CC90AEFEeb795"; // RongChain-USDT 池子
  const CRC_PAIR  = "0x8cDb69f2dDE96fB98FB5AfA6eB553eaB308D16a5"; // CRC-USDT 池子

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
    debugEl.textContent += "\n" + msg;
  }

  // ===== 通用价格查询函数 =====
  async function fetchPrice(pairAddress, tokenA, tokenB, labelId, labelName) {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const pair = new ethers.Contract(pairAddress, pairAbi, provider);

      const token0 = (await pair.token0()).toLowerCase();
      const token1 = (await pair.token1()).toLowerCase();
      const reserves = await pair.getReserves();

      let price;
      if (token0 === USDT_TOKEN && token1 === tokenA) {
        price = reserves[0] / reserves[1];
      } else if (token0 === tokenA && token1 === USDT_TOKEN) {
        price = reserves[1] / reserves[0];
      } else {
        document.getElementById(labelId).innerText = `⚠️ ${labelName}池子不匹配`;
        logDebug(`${labelName}池子不匹配 token0=${token0} token1=${token1}`);
        return;
      }

      document.getElementById(labelId).innerText =
        `${labelName}/USDT 当前价格: $${price.toFixed(6)}`;
    } catch (e) {
      document.getElementById(labelId).innerText = `${labelName}价格获取失败`;
      logDebug(`${labelName} 查询出错: ` + e.message);
    }
  }

  // ===== 通用余额查询函数 =====
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
    } catch (e) {
      document.getElementById(labelId).innerText = `${labelName}余额获取失败`;
      logDebug(`${labelName} 余额查询出错: ` + e.message);
    }
  }

  // ===== 定时刷新价格 =====
  setInterval(() => fetchPrice(RONG_PAIR, RONG_TOKEN, USDT_TOKEN, "price", "RongChain"), 1000);
  setInterval(() => fetchPrice(CRC_PAIR, CRC_TOKEN, USDT_TOKEN, "crcPrice", "CRC"), 1000);

  // ===== 查询余额（加载时执行一次）=====
  fetchBalance(RONG_TOKEN, "rongBalance", "RongChain");
  fetchBalance(CRC_TOKEN, "crcBalance", "CRC");
});
