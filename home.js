// v1.25 首页逻辑：增强余额 + 价格提示
document.addEventListener("DOMContentLoaded", async () => {
  const account = new URLSearchParams(window.location.search).get("account");
  if (!account) return;

  const RONG_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e".toLowerCase();
  const USDT_TOKEN = "0x55d398326f99059ff775485246999027b3197955".toLowerCase();
  const GRAPH_API = "https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2";

  // ===== 显示钱包地址 =====
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
      const res = await fetch(GRAPH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const result = await res.json();

      if (result.data && result.data.pairs.length > 0) {
        const pair = result.data.pairs[0];
        const price = parseFloat(pair.reserve0) / parseFloat(pair.reserve1);
        document.getElementById("price").innerText =
          `RongChain/USDT 当前价格: $${price.toFixed(6)}`;
      } else {
        document.getElementById("price").innerText =
          "⚠️ 未找到池子 (检查是否在 PancakeSwap v2)";
      }
    } catch (e) {
      document.getElementById("price").innerText = "价格获取失败";
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
    } catch {
      console.warn("合约没有 decimals()，默认 18");
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
      } catch (err) {
        document.getElementById("rongBalance").innerText =
          "余额获取失败 (可能不是标准 ERC20)";
      }
    }
    fetchBalance();
  }
});
