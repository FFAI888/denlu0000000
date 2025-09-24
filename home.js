// v1.40 首页：自动获取 Pair 地址 + 链上直查价格和余额
document.addEventListener("DOMContentLoaded", async () => {
  const account = new URLSearchParams(window.location.search).get("account");
  if (!account) return;

  // 代币地址
  const RONG_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e".toLowerCase();
  const USDT_TOKEN = "0x55d398326f99059ff775485246999027b3197955".toLowerCase();

  // PancakeSwap V2 工厂合约（BSC）
  const FACTORY_ADDRESS = "0xca143ce32fe78f1f7019d7d551a6402fc5350c73";
  const factoryAbi = [
    "function getPair(address tokenA, address tokenB) external view returns (address)"
  ];

  const debugEl = document.getElementById("debug");
  function logDebug(msg) {
    debugEl.textContent += "\n" + msg;
  }

  // 显示钱包地址
  const walletEl = document.getElementById("walletAddress");
  if (walletEl) walletEl.innerText = "钱包地址: " + account;

  // ===== 自动获取池子地址 =====
  async function getPairAddress() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, provider);

      const pairAddress = await factory.getPair(RONG_TOKEN, USDT_TOKEN);
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

  // ===== 链上直查价格 =====
  async function fetchPrice(pairAddress) {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const pairAbi = [
        "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
        "function token0() view returns (address)",
        "function token1() view returns (address)"
      ];
      const pair = new ethers.Contract(pairAddress, pairAbi, provider);

      const token0 = (await pair.token0()).toLowerCase();
      const token1 = (await pair.token1()).toLowerCase();
      const reserves = await pair.getReserves();

      logDebug("token0: " + token0);
      logDebug("token1: " + token1);
      logDebug("reserve0: " + reserves[0].toString());
      logDebug("reserve1: " + reserves[1].toString());

      let price;
      if (token0 === USDT_TOKEN && token1 === RONG_TOKEN) {
        price = reserves[0] / reserves[1]; // USDT / RONG
      } else if (token0 === RONG_TOKEN && token1 === USDT_TOKEN) {
        price = reserves[1] / reserves[0]; // USDT / RONG
      } else {
        document.getElementById("price").innerText = "⚠️ 池子不匹配 (不是 USDT-RONG)";
        return;
      }

      document.getElementById("price").innerText =
        `RongChain/USDT 当前价格: $${price.toFixed(6)}`;
      logDebug("计算价格成功: " + price.toFixed(6));
    } catch (e) {
      document.getElementById("price").innerText = "价格获取失败";
      logDebug("链上查询出错: " + e.message);
    }
  }

  // ===== 查询用户余额 =====
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

      logDebug("decimals: " + decimals);
      logDebug("symbol: " + symbol);
      logDebug("原始余额: " + rawBalance.toString());
      logDebug("换算后余额: " + formattedBalance);
    } catch (e) {
      document.getElementById("rongBalance").innerText = "余额获取失败";
      logDebug("余额查询出错: " + e.message);
    }
  }

  // 执行
  const pairAddress = await getPairAddress();
  if (pairAddress) {
    await fetchPrice(pairAddress);
  }
  await fetchBalance();
});
