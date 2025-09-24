// v1.08 钱包地址 + PancakeSwap 实时价格 + K 线图
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const account = urlParams.get("account");
  if (account) {
    document.getElementById("walletAddress").innerText = "钱包地址: " + account;
  } else {
    document.getElementById("walletAddress").innerText = "未检测到钱包地址";
  }

  // ====== 获取 RongChain/USDT 实时价格 ======
  const RONG_TOKEN = "0x7f20dE20b53b8145F75F7a7Bc55CC90AEFEeb795"; // 真实 RongChain 合约地址
  const USDT_TOKEN = "0x55d398326f99059fF775485246999027B3197955"; // BSC 上 USDT 合约
  const GRAPH_API = "https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2";

  async function fetchPrice() {
    try {
      const query = `
      {
        pairs(where: {token0: "${RONG_TOKEN}", token1: "${USDT_TOKEN}"}) {
          reserve0
          reserve1
        }
      }`;
      const response = await fetch(GRAPH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const result = await response.json();
      if (result.data && result.data.pairs.length > 0) {
        const pair = result.data.pairs[0];
        const price = parseFloat(pair.reserve1) / parseFloat(pair.reserve0);
        document.getElementById("price").innerText =
          `RongChain/USDT 当前价格: $${price.toFixed(4)} (PancakeSwap)`;
      } else {
        document.getElementById("price").innerText = "未找到 RongChain/USDT 流动池";
      }
    } catch (error) {
      console.error(error);
      document.getElementById("price").innerText = "价格获取失败";
    }
  }
  fetchPrice();
  setInterval(fetchPrice, 15000);

  // ====== 获取 K 线数据（按 1 小时聚合） ======
  const chart = LightweightCharts.createChart(document.getElementById("kline"), {
    width: 350,
    height: 300,
    layout: { background: { color: "#ffffff" }, textColor: "#333" },
    grid: { vertLines: { color: "#eee" }, horzLines: { color: "#eee" } },
  });
  const candleSeries = chart.addCandlestickSeries();

  async function fetchKline() {
    try {
      const query = `
      {
        swaps(
          where: { pair_: { token0: "${RONG_TOKEN}", token1: "${USDT_TOKEN}" } }
          orderBy: timestamp
          orderDirection: desc
          first: 200
        ) {
          timestamp
          amount0In
          amount0Out
          amount1In
          amount1Out
        }
      }`;
      const response = await fetch(GRAPH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const result = await response.json();

      if (result.data && result.data.swaps.length > 0) {
        // 将 swap 数据聚合成 1 小时蜡烛
        const rawSwaps = result.data.swaps;
        const candlesMap = {};

        rawSwaps.forEach(swap => {
          const ts = parseInt(swap.timestamp);
          const hour = Math.floor(ts / 3600) * 3600; // 按小时对齐时间
          const price = (parseFloat(swap.amount1In) + parseFloat(swap.amount1Out)) /
                        (parseFloat(swap.amount0In) + parseFloat(swap.amount0Out) || 1);

          if (!candlesMap[hour]) {
            candlesMap[hour] = { time: hour, open: price, high: price, low: price, close: price };
          } else {
            const c = candlesMap[hour];
            c.high = Math.max(c.high, price);
            c.low = Math.min(c.low, price);
            c.close = price;
          }
        });

        const candles = Object.values(candlesMap).sort((a, b) => a.time - b.time);
        candleSeries.setData(candles);
      } else {
        console.warn("没有找到历史交易数据");
      }
    } catch (error) {
      console.error("获取 K 线失败:", error);
    }
  }
  fetchKline();
});
