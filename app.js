// v1.18 登录页 + 首页行情 + 余额增强
document.addEventListener("DOMContentLoaded", async () => {
  // ===== 登录页 =====
  const connectWalletBtn = document.getElementById("connectWalletBtn");
  if (connectWalletBtn) {
    connectWalletBtn.addEventListener("click", async () => {
      alert("按钮点击事件已触发");
      if (typeof window.ethereum !== "undefined") {
        try {
          const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
          const account = accounts[0];
          alert("钱包已连接: " + account);
          window.location.href = "home.html?account=" + account;
        } catch (err) {
          alert("连接钱包失败: " + err.message);
        }
      } else {
        alert("未检测到 MetaMask，请安装钱包插件");
      }
    });
    return;
  }

  // ===== 首页 =====
  const account = new URLSearchParams(window.location.search).get("account");
  if (!account) return;

  const RONG_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e";
  const USDT_TOKEN = "0x55d398326f99059fF775485246999027B3197955";
  const GRAPH_API = "https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2";

  // 显示钱包地址
  const walletEl = document.getElementById("walletAddress");
  if (walletEl) walletEl.innerText = "钱包地址: " + account;

  // ===== 实时价格 =====
  async function fetchPrice() {
    if (!document.getElementById("price")) return;

    async function queryPair(token0, token1) {
      const query = `
      {
        pairs(where: {token0: "${token0}", token1: "${token1}"}) {
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
      return result.data && result.data.pairs.length > 0 ? result.data.pairs[0] : null;
    }

    try {
      let pair = await queryPair(RONG_TOKEN, USDT_TOKEN);
      let reverse = false;
      if (!pair) {
        pair = await queryPair(USDT_TOKEN, RONG_TOKEN);
        reverse = true;
      }

      if (pair) {
        let price;
        if (!reverse) {
          price = parseFloat(pair.reserve1) / parseFloat(pair.reserve0);
        } else {
          price = parseFloat(pair.reserve0) / parseFloat(pair.reserve1);
        }
        document.getElementById("price").innerText =
          `RongChain/USDT 当前价格: $${price.toFixed(4)} (PancakeSwap)`;
      } else {
        document.getElementById("price").innerText =
          "未找到 RongChain/USDT 流动池，请确认是否已在 PancakeSwap 建池";
      }
    } catch (e) {
      document.getElementById("price").innerText = "价格获取失败";
    }
  }
  fetchPrice();
  setInterval(fetchPrice, 15000);

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
    } catch {
      console.warn("合约未实现 decimals()，默认使用 18");
    }

    async function fetchBalance() {
      try {
        const balance = await tokenContract.balanceOf(account);
        const formatted = ethers.utils.formatUnits(balance, decimals);
        document.getElementById("rongBalance").innerText =
          "RongChain 余额: " + parseFloat(formatted).toFixed(4);
      } catch {
        document.getElementById("rongBalance").innerText =
          "余额获取失败，请确认合约是否为标准 ERC20";
      }
    }
    fetchBalance();
    setInterval(fetchBalance, 15000);
  }
});
