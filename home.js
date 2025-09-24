// v1.32 首页：调试框只显示关键数据
document.addEventListener("DOMContentLoaded", async () => {
  const account = new URLSearchParams(window.location.search).get("account");
  if (!account) return;

  const RONG_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e".toLowerCase();
  const USDT_TOKEN = "0x55d398326f99059ff775485246999027b3197955".toLowerCase();
  const GRAPH_V2 = "https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v2-bsc";

  const debugEl = document.getElementById("debug");
  function logDebug(msg) {
    debugEl.textContent += "\n" + msg;
  }

  // 显示钱包地址
  const walletEl = document.getElementById("walletAddress");
  if (walletEl) walletEl.innerText = "钱包地址: " + account;

  // ===== 查询价格（仅 v2）=====
  async function fetchPrice() {
    try {
      const query = `
      {
        pairs(where: {token0: "${USDT_TOKEN}", token1: "${RONG_TOKEN}"}) {
          id reserve0 reserve1
        }
      }`;

      const res = await fetch(GRAPH_V2, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const result = await res.json();

      if (result.data && result.data.pairs.length > 0) {
        const pair = result.data.pairs[0];
        const price = parseFloat(pair.reserve0) / parseFloat(pair.reserve1);

        // 页面显示价格
        document.getElementById("price").innerText =
          `RongChain/USDT 当前价格 (v2): $${price.toFixed(6)}`;

        // 调试框关键数据
        logDebug("池子 ID: " + pair.id);
        logDebug("reserve0 (USDT): " + pair.reserve0);
        logDebug("reserve1 (RONG): " + pair.reserve1);
        logDebug("计算价格: " + price.toFixed(6));
      } else {
        document.getElementById("price").innerText =
          "⚠️ 未找到池子 (检查是否在 PancakeSwap v2)";
        logDebug("没找到池子");
      }
    } catch (e) {
      document.getElementById("price").innerText = "价格获取失败";
      logDebug("价格查询出错: " + e.message);
    }
  }
  fetchPrice();
});
