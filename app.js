// v1.11 统一逻辑：登录页 + 首页行情 + 余额
document.addEventListener("DOMContentLoaded", async () => {
  // ===== 登录页逻辑 =====
  const connectWalletBtn = document.getElementById("connectWalletBtn");
  if (connectWalletBtn) {
    connectWalletBtn.addEventListener("click", async () => {
      console.log("连接钱包按钮被点击");
      if (typeof window.ethereum !== "undefined") {
        try {
          const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
          const account = accounts[0];
          console.log("钱包已连接:", account);
          window.location.href = "home.html?account=" + account;
        } catch (error) {
          alert("连接钱包失败: " + error.message);
        }
      } else {
        alert("未检测到钱包，请安装 MetaMask 插件");
      }
    });
  }

  // ===== 首页逻辑 =====
  const account = new URLSearchParams(window.location.search).get("account");
  const addressEl = document.getElementById("walletAddress");
  if (addressEl && account) {
    addressEl.innerText = "钱包地址: " + account;
  }

  const RONG_TOKEN = "0x7f20dE20b53b8145F75F7a7Bc55CC90AEFEeb795";
  const USDT_TOKEN = "0x55d398326f99059fF775485246999027B3197955";
  const GRAPH_API = "https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2";

  // ===== 实时价格 =====
  async function fetchPrice() {
    if (!document.getElementById("price")) return;
    try {
      const query = `
      {
        pairs(where: {token0: "${RONG_TOKEN}", token1: "${USDT_TOKEN}"}) {
          reserve0
          reserve1
        }
      }`;
      const res = await fetch(GRAPH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const result = await res.json();
      if (result.data && result.data.pairs.length > 0) {
        const pair = result.data.pairs[0];
        const price = parseFloat(pair.reserve1) / parseFloat(pair.reserve0);
        document.getElementById("price").innerText =
          `RongChain/USDT 当前价格: $${price.toFixed(4)} (PancakeSwap)`;
      } else {
        document.getElementById("price").innerText = "未找到 RongChain/USDT 流动池";
      }
    } catch (e) {
      console.error(e);
      document.getElementById("price").innerText = "价格获取失败";
    }
  }
  if (document.getElementById("price")) {
    fetchPrice();
    setInterval(fetchPrice, 15000);
  }

  // ===== K 线数据 =====
  if (document.getElementById("kline")) {
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
        const res = await fetch(GRAPH_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const result = await res.json();
        if (result.data && result.data.swaps.length > 0) {
          const rawSwaps = result.data.swaps;
          const candlesMap = {};
          rawSwaps.forEach(swap => {
            const ts = parseInt(swap.timestamp);
            const hour = Math.floor(ts / 3600) * 3600;
            const price =
              (parseFloat(swap.amount1In) + parseFloat(swap.amount1Out)) /
              (parseFloat(swap.amount0In) + parseFloat(swap.amount0Out) || 1);
            if (!candlesMap[hour]) {
              candlesMap[hour] = { time: hour, open: price, high: price, low: price, close: price };
            } else {
              candlesMap[hour].high = Math.max(candlesMap[hour].high, price);
              candlesMap[hour].low = Math.min(candlesMap[hour].low, price);
              candlesMap[hour].close = price;
            }
          });
          const candles = Object.values(candlesMap).sort((a, b) => a.time - b.time);
          candleSeries.setData(candles);
        }
      } catch (err) {
        console.error("获取K线失败:", err);
      }
    }
    fetchKline();
  }

  // ===== 查询余额 =====
  if (document.getElementById("rongBalance") && account && typeof window.ethereum !== "undefined") {
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
      } catch (e) {
        document.getElementById("rongBalance").innerText = "余额获取失败";
      }
    }
    fetchBalance();
    setInterval(fetchBalance, 15000);
  }
});
