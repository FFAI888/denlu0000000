// v1.20 手机调试版：关键数据用 alert 提示
document.addEventListener("DOMContentLoaded", async () => {
  const account = new URLSearchParams(window.location.search).get("account");
  if (!account) return;

  const RONG_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e";
  const USDT_TOKEN = "0x55d398326f99059fF775485246999027B3197955";
  const GRAPH_API = "https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2";

  // ===== 显示钱包地址 =====
  const walletEl = document.getElementById("walletAddress");
  if (walletEl) walletEl.innerText = "钱包地址: " + account;

  // ===== 价格 =====
  async function fetchPrice() {
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
      alert("价格查询返回: " + JSON.stringify(result));

      if (result.data && result.data.pairs.length > 0) {
        const pair = result.data.pairs[0];
        const price = parseFloat(pair.reserve1) / parseFloat(pair.reserve0);
        document.getElementById("price").innerText =
          `RongChain/USDT 当前价格: $${price.toFixed(4)}`;
        alert("价格计算成功: " + price.toFixed(4));
      } else {
        document.getElementById("price").innerText =
          "⚠️ 没找到池子，请确认是否在 PancakeSwap 建池";
        alert("价格查询结果: 没找到池子");
      }
    } catch (e) {
      document.getElementById("price").innerText = "价格获取失败";
      alert("价格查询出错: " + e.message);
    }
  }
  fetchPrice();

  // ===== 余额 =====
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
      alert("合约 decimals: " + decimals);
    } catch {
      alert("合约没有 decimals()，默认 18");
    }

    async function fetchBalance() {
      try {
        const balance = await tokenContract.balanceOf(account);
        const formatted = ethers.utils.formatUnits(balance, decimals);
        document.getElementById("rongBalance").innerText =
          "RongChain 余额: " + parseFloat(formatted).toFixed(4);
        alert("余额查询结果: " + formatted);
      } catch (err) {
        document.getElementById("rongBalance").innerText = "余额获取失败";
        alert("余额查询出错: " + err.message);
      }
    }
    fetchBalance();
  }
});
