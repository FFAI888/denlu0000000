// v1.29 首页调试版：检测代币合约函数
document.addEventListener("DOMContentLoaded", async () => {
  const account = new URLSearchParams(window.location.search).get("account");
  if (!account) return;

  const RONG_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e".toLowerCase();
  const USDT_TOKEN = "0x55d398326f99059ff775485246999027b3197955".toLowerCase();
  const GRAPH_V2 = "https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2";

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
      logDebug("发送 v2 查询: " + query);

      const res = await fetch(GRAPH_V2, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const text = await res.text();
      logDebug("v2 原始响应: " + text);

      const result = JSON.parse(text);
      if (result.data && result.data.pairs.length > 0) {
        const pair = result.data.pairs[0];
        const price = parseFloat(pair.reserve0) / parseFloat(pair.reserve1);
        document.getElementById("price").innerText =
          `RongChain/USDT 当前价格 (v2): $${price.toFixed(6)}`;
        logDebug("价格(v2)计算成功: " + price.toFixed(6));
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

  // ===== 检测合约函数 =====
  if (typeof window.ethereum !== "undefined") {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const erc20Abi = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
      "function name() view returns (string)"
    ];
    const tokenContract = new ethers.Contract(RONG_TOKEN, erc20Abi, provider);

    async function checkContract() {
      logDebug("开始检测合约函数...");
      try {
        const decimals = await tokenContract.decimals();
        logDebug("decimals() 返回: " + decimals);
      } catch (err) {
        logDebug("decimals() 报错: " + err.message);
      }

      try {
        const symbol = await tokenContract.symbol();
        logDebug("symbol() 返回: " + symbol);
      } catch (err) {
        logDebug("symbol() 报错: " + err.message);
      }

      try {
        const name = await tokenContract.name();
        logDebug("name() 返回: " + name);
      } catch (err) {
        logDebug("name() 报错: " + err.message);
      }

      try {
        const balance = await tokenContract.balanceOf(account);
        logDebug("balanceOf() 返回: " + balance.toString());
      } catch (err) {
        logDebug("balanceOf() 报错: " + err.message);
      }
    }

    checkContract();
  } else {
    logDebug("未检测到 MetaMask 环境，无法检测合约函数");
  }
});
