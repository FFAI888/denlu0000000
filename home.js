// v1.26 首页调试版：余额 + 价格 + 调试输出
document.addEventListener("DOMContentLoaded", async () => {
  const account = new URLSearchParams(window.location.search).get("account");
  if (!account) return;

  const RONG_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e".toLowerCase();
  const USDT_TOKEN = "0x55d398326f99059ff775485246999027b3197955".toLowerCase();
  const GRAPH_API = "https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2";

  const debugEl = document.getElementById("debug");
  function logDebug(msg) {
    debugEl.textContent += "\n" + msg;
  }

  // 显示钱包地址
  const walletEl = document.getElementById("walletAddress");
  if (walletEl) walletEl.innerText = "钱包地址: " + account;

  // ===== 查询价格（USDT → RONG）=====
  async function fetchPrice() {
    try {
      const query = `
      {
        pairs(where: {token0: "${USDT_TOKEN}", token1: "${RONG_TOKEN}"}) {
          id
          reserve0
          reserve1
        }
      }`;
      logDebug("发送价格查询: " + query);

      const res = await fetch(GRAPH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const result = await res.json();
      logDebug("价格查询返回: " + JSON.stringify(result));

      if (result.data && result.data.pairs.length > 0) {
        const pair = result.data.pairs[0];
        const price = parseFloat(pair.reserve0) / parseFloat(pair.reserve1);
        document.getElementById("price").innerText =
          `RongChain/USDT 当前价格: $${price.toFixed(6)}`;
        logDebug("价格计算成功: " + price.toFixed(6));
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

  // ===== 查询余额 =====
  if (document.getElementById("rongBalance") && typeof window.ethereum !== "undefined") {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const erc20Abi = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)"
    ];
    const tokenContract = new ethers.Contract(RONG_TOKEN, erc20Abi, provider);

    let decimals = 18;
    try {
      decimals = await tokenContract.decimals();
      logDebug("合约 decimals: " + decimals);
    } catch {
      logDebug("合约没有 decimals()，默认 18");
    }

    async function fetchBalance() {
      try {
        const balance = await tokenContract.balanceOf(account);
        const formatted = ethers.utils.formatUnits(balance, decimals);
        if (parseFloat(formatted) === 0) {
          document.getElementById("rongBalance").innerText = "RongChain 余额: 0";
        } else {
          document.getElementById("rongBalance").innerText =
            "RongChain 余额: " + parseFloat(formatted).toFixed(4);
        }
        logDebug("余额查询结果: " + formatted);
      } catch (err) {
        document.getElementById("rongBalance").innerText = "余额获取失败";
        logDebug("余额查询出错: " + err.message);
      }
    }
    fetchBalance();
  }
});
