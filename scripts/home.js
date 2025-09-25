// v1.74 首页脚本
// 功能：全局权限拦截、价格刷新、余额刷新、白名单校验、管理员提示、合约检测工具

(async function () {
  "use strict";

  // ===== 全局权限拦截（必须是白名单用户）=====
  const account = await enforceAuth({ requireAdmin: false });
  if (!account) return; // 已被跳转走

  // ===== 常量配置 =====
  const RONG_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e"; // RongChain
  const CRC_TOKEN = "0x5b2fe2b06e714b7bea4fd35b428077d850c48087"; // CRC
  const USDT_TOKEN = "0x55d398326f99059ff775485246999027b3197955"; // USDT
  const RONG_USDT_PAIR = "0x7f20dE20b53b8145F75F7a7Bc55CC90AEFEeb795"; // RongChain/USDT 池子
  const RONG_CRC_PAIR = "0x8cDb69f2dDE96fB98FB5AfA6eB553eaB308D16a5"; // RongChain/CRC 池子

  const WHITELIST_CONTRACT = "0x8b7D5050725631FFE42c4e2dCfc999c30228b722";

  const erc20Abi = [
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function balanceOf(address) view returns (uint256)"
  ];

  const lpAbi = [
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function getReserves() view returns (uint112,uint112,uint32)"
  ];

  const whitelistAbi = [
    "function owner() view returns (address)",
    "function isWhitelisted(address user) view returns (bool)"
  ];

  // ===== 初始化 provider =====
  const provider = new ethers.providers.Web3Provider(window.ethereum);

  // ===== 工具函数 =====
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }

  function show(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  }

  // ===== 钱包地址显示 =====
  setText("walletAddress", "钱包地址: " + account);

  // ===== 校验白名单 & 管理员 =====
  const whitelist = new ethers.Contract(WHITELIST_CONTRACT, whitelistAbi, provider);

  let realOwner = null;
  try {
    realOwner = await whitelist.owner();
    setText("ownerAddress", "合约 Owner: " + realOwner);
    setText("adminWallet", "管理员钱包地址: " + realOwner);
    show("adminWallet");
  } catch (e) {
    setText("ownerAddress", "❌ 获取 Owner 失败: " + e.message);
  }

  const isAdmin = (realOwner && realOwner.toLowerCase() === account.toLowerCase());
  if (isAdmin) {
    show("adminNotice");
    show("debugTitle");
    show("debug");
    show("adminBtn");
  }

  // ===== 查询余额 =====
  async function loadBalance(tokenAddr, elId) {
    try {
      const token = new ethers.Contract(tokenAddr, erc20Abi, provider);
      const [decimals, symbol, bal] = await Promise.all([
        token.decimals(),
        token.symbol(),
        token.balanceOf(account)
      ]);
      const balance = Number(ethers.utils.formatUnits(bal, decimals));
      setText(elId, `${symbol} 余额: ${balance}`);
    } catch (e) {
      setText(elId, `余额获取失败: ${e.message}`);
    }
  }

  // ===== 查询价格 =====
  async function loadPrice(pairAddr, baseToken, quoteToken, elId, label) {
    try {
      const pair = new ethers.Contract(pairAddr, lpAbi, provider);
      const [t0, t1, reserves] = await Promise.all([
        pair.token0(),
        pair.token1(),
        pair.getReserves()
      ]);

      let token0 = t0.toLowerCase();
      let token1 = t1.toLowerCase();
      let reserve0 = reserves[0];
      let reserve1 = reserves[1];

      if (token0 === baseToken.toLowerCase() && token1 === quoteToken.toLowerCase()) {
        const price = Number(reserve1) / Number(reserve0);
        setText(elId, `${label} 价格: ${price.toFixed(6)}`);
      } else if (token1 === baseToken.toLowerCase() && token0 === quoteToken.toLowerCase()) {
        const price = Number(reserve0) / Number(reserve1);
        setText(elId, `${label} 价格: ${price.toFixed(6)}`);
      } else {
        setText(elId, `${label} 价格: 池子不匹配`);
      }
    } catch (e) {
      setText(elId, `${label} 价格查询失败: ${e.message}`);
    }
  }

  // ===== 定时刷新 =====
  async function refresh() {
    await loadBalance(RONG_TOKEN, "rongBalance");
    await loadBalance(CRC_TOKEN, "crcBalance");

    await loadPrice(RONG_USDT_PAIR, RONG_TOKEN, USDT_TOKEN, "price", "RongChain/USDT");
    await loadPrice(RONG_CRC_PAIR, RONG_TOKEN, CRC_TOKEN, "crcPrice", "RongChain/CRC");
  }

  setInterval(refresh, 1000);
  refresh();

  // ===== 进入管理后台 =====
  window.goAdmin = () => {
    window.location.href = "admin.html?account=" + account;
  };

  // ===== 合约检测工具（仅管理员可见） =====
  if (isAdmin) {
    const checkBox = document.getElementById("contractCheck");
    checkBox.classList.remove("hidden");

    document.getElementById("checkBtn").onclick = async () => {
      const addr = document.getElementById("contractAddr").value.trim();
      const resultDiv = document.getElementById("checkResult");

      if (!addr || !ethers.utils.isAddress(addr)) {
        resultDiv.innerText = "❌ 地址无效，请输入正确的 0x 地址";
        return;
      }

      const abi = ["function owner() view returns (address)"];
      const testContract = new ethers.Contract(addr, abi, provider);

      try {
        const owner = await testContract.owner();
        resultDiv.innerText = `✅ 这是一个支持 owner() 的合约，Owner 地址为: ${owner}`;
      } catch (e) {
        resultDiv.innerText = `❌ 这个合约没有 owner() 方法，不是 Whitelist.sol\n错误: ${e.message}`;
      }
    };
  }
})();
