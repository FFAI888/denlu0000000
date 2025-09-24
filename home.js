// v1.35 首页：DexScreener 用池子地址查询价格
document.addEventListener("DOMContentLoaded", async () => {
  const account = new URLSearchParams(window.location.search).get("account");
  if (!account) return;

  const PAIR_ADDRESS = "0x7f20de20b53b8145f75f7a7bc55cc90afeeb795"; // 全小写
  const DEXSCREENER_API = `https://api.dexscreener.com/latest/dex/pairs/bsc/${PAIR_ADDRESS}`;

  const debugEl = document.getElementById("debug");
  function logDebug(msg) {
    debugEl.textContent += "\n" + msg;
  }

  // 显示钱包地址
  const walletEl = document.getElementById("walletAddress");
  if (walletEl) walletEl.innerText = "钱包地址: " + account;

  // ===== 查询价格（DexScreener by pairAddress）=====
  async function fetchPrice() {
    try {
      logDebug("请求 DexScreener: " + DEXSCREENER_API);
      const res = await fetch(DEXSCREENER_API);
      const result = await res.json();
      logDebug("DexScreener 返回: " + JSON.stringify(result));

      if (result && result.pairs && result.pairs.length > 0) {
        const pair = result.pairs[0];
        const priceUsd = pair.priceUsd;
        const liquidity = pair.liquidity ? pair.liquidity.usd : "未知";
        const volume24h = pair.volume ? pair.volume.h24 : "未知";

        document.getElementById("price").innerText =
          `RongChain/USDT 当前价格: $${parseFloat(priceUsd).toFixed(6)}`;

        logDebug("池子地址: " + pair.pairAddress);
        logDebug("价格: " + priceUsd);
        logDebug("流动性(USD): " + liquidity);
        logDebug("24h 成交量(USD): " + volume24h);
      } else {
        document.getElementById("price").innerText =
          "⚠️ DexScreener 未找到该池子";
        logDebug("返回为空");
      }
    } catch (e) {
      document.getElementById("price").innerText = "价格获取失败";
      logDebug("DexScreener 查询出错: " + e.message);
    }
  }
  fetchPrice();
});
