// v1.09 钱包地址 + PancakeSwap 行情 + RongChain 余额
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const account = urlParams.get("account");
  if (account) {
    document.getElementById("walletAddress").innerText = "钱包地址: " + account;
  } else {
    document.getElementById("walletAddress").innerText = "未检测到钱包地址";
  }

  // ====== 实时价格（保持不变） ======
  const RONG_TOKEN = "0x7f20dE20b53b8145F75F7a7Bc55CC90AEFEeb795"; // RongChain 合约地址
  const USDT_TOKEN = "0x55d398326f99059fF775485246999027B3197955"; // BSC USDT
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

  // ====== K 线数据（保持 v1.08 逻辑） ======
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
        const rawSwaps = result.data.swaps;
        const candlesMap = {};

        rawSwaps.forEach(swap => {
          const ts = parseInt(swap.timestamp);
          const hour = Math.floor(ts / 3600) * 3600;
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
      }
    } catch (error) {
      console.error("获取 K 线失败:", error);
    }
  }
  fetchKline();

  // ====== 查询钱包余额 ======
  if (typeof window.ethereum !== "undefined" && account) {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const erc20Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)"
      ];
      const tokenContract = new ethers.Contract(RONG_TOKEN, erc20Abi, provider);
      const decimals = await tokenContract.decimals();
      async function fetchBalance() {
        try {
          const balance = await tokenContract.balanceOf(account);
          const formatted = ethers.utils.formatUnits(balance, decimals);
          document.getElementById("rongBalance").innerText =
            "RongChain 余额: " + parseFloat(formatted).toFixed(4);
        } catch (err) {
          document.getElementById("rongBalance").innerText = "余额获取失败";
        }
      }
      fetchBalance();
      setInterval(fetchBalance, 15000); // 每 15 秒刷新一次
    } catch (err) {
      document.getElementById("rongBalance").innerText = "余额检测失败";
    }
  }
});
