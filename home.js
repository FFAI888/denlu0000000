// v1.41 首页：链上直查价格 + 每秒刷新一次
document.addEventListener("DOMContentLoaded", async () => {
  const account = new URLSearchParams(window.location.search).get("account");
  if (!account) return;

  const RONG_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e".toLowerCase();
  const USDT_TOKEN = "0x55d398326f99059ff775485246999027b3197955".toLowerCase();
  const FACTORY_ADDRESS = "0xca143ce32fe78f1f7019d7d551a6402fc5350c73";

  const factoryAbi = [
    "function getPair(address tokenA, address tokenB) external view returns (address)"
  ];
  const pairAbi = [
    "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function token0() view returns (address)",
    "function token1() view returns (address)"
  ];

  const debugEl = document.getElementById("debug");
  function logDebug(msg) {
    debugEl.textContent += "\n" + msg;
  }

  // 显示钱包地址
  const walletEl = document.getElementById("walletAddress");
  if (walletEl) walletEl.innerText = "钱包地址: " + account;

  let pairAddress = null;

  // 自动获取池子地址
  async function getPairAddress() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, provider);

      pairAddress = await factory.getPair(RONG_TOKEN, USDT_TOKEN);
      logDebug("自动查询到的池子地址: " + pairAddress);

      if (pairAddress === "0x0000000000000000000000000000000000000000") {
        document.getElementById("price").innerText = "⚠️ 没有找到 USDT-RONG 池子";
        return null;
      }
      return pairAddress;
    } catch (e) {
      logDebug("获取 Pair 地址失败: " + e.message);
      return null;
    }
  }

  // 链上直查价格
  async function fetchPrice() {
    try {
      if (!pairAddress) return;

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const pair = new ethers.Contract(pairAddress, pairAbi, provider);

      const token0 = (await pair.token0()).toLowerCase();
      const token1 = (await pair.token1()).toLowerCase();
      const reserves = await pair.getReserves();

      let price;
      if (token0 === USDT_TOKEN && token1 === RONG_TOKEN) {
        price = reserves[0] / reserves[1];
      } else if (token0 === RONG_TOKEN && token1 === USDT_TOKEN) {
        price = reserves[1] / reserves[0];
      } else {
        document.getElementById("price").innerText = "⚠️ 池子不匹配 (不是 USDT-RONG)";
        return;
      }

      document.getElementById("price").innerText =
        `RongChain/USDT 当前价格: $${price.toFixed(6)}`;
    } catch (e) {
      document.getElementById("price").innerText = "价格获取失败";
      logDebug("链上查询出错: " + e.message);
    }
  }

  // 查询余额（不需要秒刷）
  async function fetchBalance() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const erc20Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)"
      ];
      const token = new ethers.Contract(RONG_TOKEN, erc20Abi, provider);

      const decimals = await token.decimals();
      const symbol = await token.symbol();
      const rawBalance = await token.balanceOf(account);
      const formattedBalance = ethers.utils.formatUnits(rawBalance, decimals);

      document.getElementById("rongBalance").innerText =
        `RongChain 余额: ${parseFloat(formattedBalance).toFixed(4)} ${symbol}`;
    } catch (e) {
      document.getElementById("rongBalance").innerText = "余额获取失败";
      logDebug("余额查询出错: " + e.message);
    }
  }

  // 初始化执行
  const foundPair = await getPairAddress();
  if (foundPair) {
    await fetchPrice();
    // 每秒刷新一次价格
    setInterval(fetchPrice, 1000);
  }
  await fetchBalance();
});
