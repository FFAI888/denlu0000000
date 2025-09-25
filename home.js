// v1.73 首页：白名单校验 + 地址检测 + 行情 + 余额 + 事件监听 + 实时显示 owner + 健壮性与缓存
(function () {
  "use strict";

  // ===== 版本号（仅此文件本次+0.01）=====
  const VERSION = "v1.73";

  // ===== 页面加载 =====
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      // 在标题上标记版本（不改 HTML 结构）
      try {
        document.title = (document.title || "RongChain DApp 首页") + " - " + VERSION;
      } catch {}

      // 获取账户（URL优先，其次请求钱包）
      let account = new URLSearchParams(window.location.search).get("account");
      if (!account && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
          account = accounts && accounts[0] ? accounts[0] : "";
        } catch (e) {
          setNotice("⚠️ 未连接钱包，请先登录！(" + (e && e.message ? e.message : e) + ")");
          return;
        }
      }
      if (!account) {
        setNotice("⚠️ 未检测到钱包，请先登录！");
        return;
      }

      // 显示钱包地址
      setText("walletAddress", "钱包地址: " + account);

      // ===== 合约与常量 =====
      const WHITELIST_CONTRACT = "0x8b7D5050725631FFE42c4e2dCfc999c30228b722";

      const RONG_TOKEN = "0x0337a015467af6605c4262d9f02a3dcd8b576f7e".toLowerCase();
      const CRC_TOKEN  = "0x5b2fe2b06e714b7bea4fd35b428077d850c48087".toLowerCase();
      const USDT_TOKEN = "0x55d398326f99059ff775485246999027b3197955".toLowerCase();

      const RONG_USDT_PAIR = "0x7f20dE20b53b8145F75F7a7Bc55CC90AEFEeb795";
      const RONG_CRC_PAIR  = "0x8cDb69f2dDE96fB98FB5AfA6eB553eaB308D16a5";

      // ABI
      const whitelistAbi = [
        "function owner() view returns (address)",
        "function isWhitelisted(address user) view returns (bool)",
        "event Added(address indexed user)",
        "event Removed(address indexed user)"
      ];
      const pairAbi = [
        "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
        "function token0() view returns (address)",
        "function token1() view returns (address)"
      ];
      const erc20Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)"
      ];

      // ===== Provider & 合约实例 =====
      if (typeof ethers === "undefined") {
        setNotice("❌ 未找到 ethers，请检查脚本引入。");
        return;
      }
      if (!window.ethereum) {
        setNotice("❌ 未检测到钱包环境，请在支持 Web3 的浏览器/钱包内打开。");
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const whitelist = new ethers.Contract(WHITELIST_CONTRACT, whitelistAbi, provider);

      // ===== 校验合约存在 & 读取 Owner & 白名单权限 =====
      let realOwner;
      try {
        realOwner = await whitelist.owner();
        setText("ownerAddress", "合约 Owner: " + realOwner);
      } catch (e) {
        setNotice("❌ 白名单合约地址无效，请检查配置（owner 调用失败）: " + (e && e.message ? e.message : e));
        return;
      }

      let allowed = false;
      try {
        allowed = await whitelist.isWhitelisted(account);
      } catch (e) {
        setNotice("❌ 白名单校验失败: " + (e && e.message ? e.message : e));
        return;
      }
      if (!allowed) {
        setNotice("⚠️ 你没有访问权限");
        return;
      }

      // 是否管理员
      const isAdmin = (realOwner && realOwner.toLowerCase() === account.toLowerCase());
      if (isAdmin) {
        show("debugTitle");
        show("debug");
        show("adminBtn");
      }

      // 展示主内容
      hide("loginNotice");
      show("appContent");

      // 管理后台入口
      window.goAdmin = function () {
        try {
          window.location.href = "admin.html?account=" + account;
        } catch {}
      };

      // ===== 调试输出 =====
      function logDebug(msg) {
        if (!isAdmin) return;
        const now = new Date().toLocaleTimeString();
        const el = byId("debug");
        if (el) el.textContent += `\n[${now}] ${msg}`;
      }
      logDebug("页面版本 " + VERSION);
      logDebug("当前账户 " + account);
      logDebug("合约 Owner " + realOwner);

      // ===== 代币元数据缓存 =====
      const tokenMetaCache = new Map(); // address(lower) -> {decimals, symbol, contract}

      async function getTokenMeta(address) {
        const key = address.toLowerCase();
        if (tokenMetaCache.has(key)) return tokenMetaCache.get(key);
        const c = new ethers.Contract(key, erc20Abi, provider);
        const [dec, sym] = await Promise.all([c.decimals(), c.symbol()]);
        const meta = { decimals: dec, symbol: sym, contract: c };
        tokenMetaCache.set(key, meta);
        return meta;
      }

      // 预加载三个代币元数据，避免每秒重复请求
      try {
        await Promise.all([getTokenMeta(RONG_TOKEN), getTokenMeta(CRC_TOKEN), getTokenMeta(USDT_TOKEN)]);
      } catch (e) {
        logDebug("预加载代币元数据失败: " + (e && e.message ? e.message : e));
      }

      // ===== 行情：从 LP 读取储备并换算价格 =====
      async function getPairPrice(pairAddress, baseTokenAddr, quoteTokenAddr) {
        try {
          const pair = new ethers.Contract(pairAddress, pairAbi, provider);
          let [token0, token1] = await Promise.all([pair.token0(), pair.token1()]);
          token0 = token0.toLowerCase();
          token1 = token1.toLowerCase();

          // 读取储备
          const reserves = await pair.getReserves();
          const reserve0 = reserves[0]; // BigNumber
          const reserve1 = reserves[1]; // BigNumber

          // 读取小数
          const baseMeta = await getTokenMeta(baseTokenAddr);
          const quoteMeta = await getTokenMeta(quoteTokenAddr);

          // 对应关系：price = (reserveQuote / 10^quoteDec) / (reserveBase / 10^baseDec)
          if (token0 === baseTokenAddr && token1 === quoteTokenAddr) {
            const q = parseFloat(ethers.utils.formatUnits(reserve1, quoteMeta.decimals));
            const b = parseFloat(ethers.utils.formatUnits(reserve0, baseMeta.decimals));
            if (b === 0) return null;
            return q / b;
          } else if (token0 === quoteTokenAddr && token1 === baseTokenAddr) {
            const q = parseFloat(ethers.utils.formatUnits(reserve0, quoteMeta.decimals));
            const b = parseFloat(ethers.utils.formatUnits(reserve1, baseMeta.decimals));
            if (b === 0) return null;
            return q / b;
          } else {
            logDebug(`池子不匹配: ${pairAddress} (${token0} / ${token1})`);
            return null;
          }
        } catch (e) {
          logDebug(`价格查询失败(${pairAddress}): ${e && e.message ? e.message : e}`);
          return null;
        }
      }

      async function refreshPrices() {
        // RONG/USDT
        const rongUsd = await getPairPrice(RONG_USDT_PAIR, RONG_TOKEN, USDT_TOKEN);
        if (rongUsd && isFinite(rongUsd)) {
          setText("price", `RongChain/USDT 当前价格: $${formatNumber(rongUsd, 6)}`);
        } else {
          setText("price", "RongChain/USDT 价格: 暂无");
        }

        // RONG/CRC & CRC/USDT
        const rongCrc = await getPairPrice(RONG_CRC_PAIR, RONG_TOKEN, CRC_TOKEN);
        if (rongUsd && rongCrc && isFinite(rongUsd) && isFinite(rongCrc) && rongCrc !== 0) {
          const crcUsd = rongUsd / rongCrc; // (RONG/USDT) / (RONG/CRC) = CRC/USDT
          setText("crcPrice", `CRC/USDT 当前价格: $${formatNumber(crcUsd, 6)}`);
        } else {
          setText("crcPrice", "CRC/USDT 价格: 暂无");
        }
      }

      // ===== 余额：读取 ERC20 balanceOf =====
      async function fetchBalance(tokenAddr, labelId, labelName) {
        try {
          const meta = await getTokenMeta(tokenAddr);
          const raw = await meta.contract.balanceOf(account);
          const fmt = ethers.utils.formatUnits(raw, meta.decimals);
          setText(labelId, `${labelName} 余额: ${formatNumber(fmt, 4)} ${meta.symbol}`);
        } catch (e) {
          setText(labelId, `${labelName}余额获取失败`);
          logDebug(`${labelName} 余额获取失败: ${e && e.message ? e.message : e}`);
        }
      }

      // ===== 定时刷新：每秒 =====
      async function refreshAll() {
        await Promise.all([
          refreshPrices(),
          fetchBalance(RONG_TOKEN, "rongBalance", "RongChain"),
          fetchBalance(CRC_TOKEN,  "crcBalance",  "CRC")
        ]);
      }
      // 首次立即刷新
      refreshAll().catch(() => {});
      // 每秒定时
      const timer = setInterval(() => {
        refreshAll().catch((e) => logDebug("定时刷新异常: " + (e && e.message ? e.message : e)));
      }, 1000);

      // ===== 白名单事件监听 =====
      try {
        whitelist.on("Added", (user) => {
          if (!user) return;
          if (String(user).toLowerCase() === account.toLowerCase()) {
            alert("✅ 你已被加入白名单，功能已解锁");
          }
        });
        whitelist.on("Removed", (user) => {
          if (!user) return;
          if (String(user).toLowerCase() === account.toLowerCase()) {
            alert("⚠️ 你已被移出白名单，功能将锁定");
            // 还原为未授权状态
            hide("appContent");
            show("loginNotice");
            setNotice("⚠️ 你没有访问权限");
            try { clearInterval(timer); } catch {}
          }
        });
      } catch (e) {
        logDebug("事件监听失败: " + (e && e.message ? e.message : e));
      }

      // ===== 工具函数 =====
      function byId(id) {
        return document.getElementById(id);
      }
      function show(id) {
        const el = byId(id);
        if (el) el.classList.remove("hidden");
      }
      function hide(id) {
        const el = byId(id);
        if (el) el.classList.add("hidden");
      }
      function setText(id, text) {
        const el = byId(id);
        if (el) el.innerText = text;
      }
      function setNotice(text) {
        setText("loginNotice", text);
        show("loginNotice");
        hide("appContent");
      }
      function formatNumber(n, digits) {
        const num = typeof n === "string" ? parseFloat(n) : n;
        if (!isFinite(num)) return "0";
        return Number(num).toFixed(digits);
      }
    } catch (fatal) {
      // 最顶层兜底
      try {
        const msg = fatal && fatal.message ? fatal.message : String(fatal);
        setText("loginNotice", "❌ 页面初始化失败: " + msg);
      } catch {}
    }
  });
})();
