// v1.37 链上直查池子储备量
document.addEventListener("DOMContentLoaded", async () => {
  const account = new URLSearchParams(window.location.search).get("account");
  if (!account) return;

  // 代币 & 池子地址
  const RONG_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e".toLowerCase();
  const USDT_TOKEN = "0x55d398326f99059ff775485246999027b3197955".toLowerCase();
  const PAIR_ADDRESS = "0x7f20de20b53b8145f75f7a7bc55cc90afeeb795"; // 你给的池子地址（已小写）

  const debugEl = document.getElementById("debug");
  function logDebug(msg) {
    debugEl.textContent += "\n" + msg;
  }

  // 显示钱包地址
  const walletEl = document.getElementById("walletAddress");
  if (walletEl) walletEl.innerText = "钱包地址: " + account;

  // ===== 链上直查价格 =====
  async function fetchPrice() {
    try {
      if (typeof window.ethereum === "undefined") {
        document.getElementById("price").innerText = "未检测到钱包环境";
        logDebug("没有检测到 MetaMask/钱包");
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const pairAbi = [
        "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
        "function token0() view returns (address)",
        "function token1() view returns (address)"
      ];
      const pair = new ethers.Contract(PAIR_ADDRESS, pairAbi, provider);

      const token0 = (await pair.token0()).toLowerCase();
      const token1 = (await pair.token1()).toLowerCase();
      const reserves = await pair.getReserves();

      logDebug("池子地址: " + PAIR_ADDRESS);
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
        document.getElementById("price").innerText =
          "⚠️ 池子不匹配 (不是 USDT-RONG)";
        logDebug("池子代币不匹配");
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

  fetchPrice();
});
