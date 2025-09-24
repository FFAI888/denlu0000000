// v1.28 首页调试版：支持 PancakeSwap v2 + v3
document.addEventListener("DOMContentLoaded", async () => {
  const account = new URLSearchParams(window.location.search).get("account");
  if (!account) return;

  const RONG_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e".toLowerCase();
  const USDT_TOKEN = "0x55d398326f99059ff775485246999027b3197955".toLowerCase();

  const GRAPH_V2 = "https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2";
  const GRAPH_V3 = "https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc";

  const debugEl = document.getElementById("debug");
  function logDebug(msg) {
    debugEl.textContent += "\n" + msg;
  }

  function isValidAddress(addr) {
    return /^0x[a-f0-9]{40}$/.test(addr);
  }

  // 显示钱包地址
  const walletEl = document.getElementById("walletAddress");
  if (walletEl) walletEl.innerText = "钱包地址: " + account;

  // ===== 通用查询 =====
  async function querySubgraph(url, token0, token1, version) {
    const query =
      version === "v2"
        ? `{
            pairs(where: {token0: "${token0}", token1: "${token1}"}) {
              id reserve0 reserve1
            }
          }`
        : `{
            pools(where: {token0: "${token0}", token1: "${token1}"}) {
              id liquidity sqrtPrice
              token0 { symbol decimals }
              token1 { symbol decimals }
            }
          }`;

    logDebug(`发送 ${version} 查询: ${query}`);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    logDebug(`${version} 原始响应: ${text}`);
    return JSON.parse(text);
  }

  // ===== 查询价格 =====
  async function fetchPrice() {
    try {
      if (!isValidAddress(RONG_TOKEN) || !isValidAddress(USDT_TOKEN)) {
        document.getElementById("price").innerText = "地址格式不对";
        logDebug("地址验证失败");
        return;
      }

      // 先查 v2
      let result = await querySubgraph(GRAPH_V2, USDT_TOKEN, RONG_TOKEN, "v2");
      if (result.data && result.data.pairs && result.data.pairs.length > 0) {
        const pair = result.data.pairs[0];
        const price = parseFloat(pair.reserve0) / parseFloat(pair.reserve1);
        document.getElementById("price").innerText =
          `RongChain/USDT 当前价格 (v2): $${price.toFixed(6)}`;
        logDebug("价格(v2)计算成功: " + price.toFixed(6));
        return;
      }

      // 如果 v2 没数据，再查 v3
      result = await querySubgraph(GRAPH_V3, USDT_TOKEN, RONG_TOKEN, "v3");
      if (result.data && result.data.pools && result.data.pools.length > 0) {
        const pool = result.data.pools[0];
        const sqrtPrice = parseFloat(pool.sqrtPrice);
        // v3 价格 = (sqrtPrice^2) / (10^(decimalsToken1 - decimalsToken0))
        const decimals0 = pool.token0.decimals;
        const decimals1 = pool.token1.decimals;
        const price =
          (sqrtPrice * sqrtPrice) /
          Math.pow(10, decimals1 - decimals0);

        document.getElementById("price").innerText =
          `RongChain/USDT 当前价格 (v3): $${price.toFixed(6)}`;
        logDebug("价格(v3)计算成功: " + price.toFixed(6));
        return;
      }

      document.getElementById("price").innerText = "⚠️ 未找到池子 (v2/v3)";
      logDebug("没找到池子");
    } catch (e) {
      document.getElementById("price").innerText = "价格获取失败";
      logDebug("价格查询出错: " + e.message);
    }
  }
  fetchPrice();
});
