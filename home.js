// v1.33 首页：用 DexScreener API 查询价格
document.addEventListener("DOMContentLoaded", async () => {
  const account = new URLSearchParams(window.location.search).get("account");
  if (!account) return;

  const RONG_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e".toLowerCase();
  const USDT_TOKEN = "0x55d398326f99059ff775485246999027b3197955".toLowerCase();
  const DEXSCREENER_API = `https://api.dexscreener.com/latest/dex/pairs/bsc/${USDT_TOKEN}/${RONG_TOKEN}`;

  const debugEl = document.getElementById("debug");
  function logDebug(msg) {
    debugEl.textContent += "\n" + msg;
  }

  // 显示钱包地址
  const walletEl = document.getElementById("walletAddress");
  if (walletEl) walletEl.innerText = "钱包地址: " + account;

  // ===== 查询价格（DexScreener）=====
  async function fetchPrice() {
    try {
      logDebug("请求 DexScreener: " + DEXSCREENER_API);
      const res = await fetch(DEXSCREENER_API);
      const result = await res.json();
      logDebug("DexScreener 返回: " + JSON.stringify(result));

      if (result && result.pairs && result.pairs.length > 0) {
        const pair = result.pairs[0];
        const priceUsd = pair.priceUsd;
        document.getElementById("price").innerText =
          `RongChain/USDT 当前价格: $${parseFloat(priceUsd).toFixed(6)}`;
        logDebug("价格计算成功: " + priceUsd);
      } else {
        document.getElementById("price").innerText =
          "⚠️ DexScreener 未找到池子";
        logDebug("返回数据里没找到 pairs");
      }
    } catch (e) {
      document.getElementById("price").innerText = "价格获取失败";
      logDebug("DexScreener 查询出错: " + e.message);
    }
  }
  fetchPrice();
});
