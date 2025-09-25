v1.74 全局权限拦截器
异步 功能 enforceAuth（{ requireAdmin = false } = {}) {
if （typeof 醚 === "undefined") {
警报（“缺少 ❌ 醚.js，请检查配置“）;
窗.位置.href = "index.html";
    返回;
  }

如果 （！窗.ethereum） {
警报（“没有❌检测到钱包，请安装 MetaMask”）;
窗.位置.href = "index.html";
    返回;
  }

  常量 供应商 =新增功能 醚.供应商.Web3Provider（窗.ethereum）;
  常量 帐户 = 等待 供应商.发送("eth_requestAccounts", []);
if （！帐户 || 帐户.长度 === 0) {
    警报("⚠️ 未检测到钱包账户");
窗.位置.href = "index.html";
    返回;
  }
  常量 账户 = 帐户[0];

  // 白名单合约
常量 WHITELIST_CONTRACT = "0x8b7D5050725631FFE42c4e2dCfc999c30228b722";
常量 whitelistAbi = [
“函数 owner（） 视图返回 （地址）”，
“function isWhitelisted（address user） 查看 返回 （bool）”
  ];
  常量 张 =新增功能 醚.张（WHITELIST_CONTRACT， whitelistAbi， 供应商）;

  try {
    常量 允许 =等待 张.isWhitelisted（账户）;
如果 （！允许） {
      警报("⚠️ 你不在白名单，将返回登录页");
窗.位置.href = "index.html";
      返回;
    }
  } 抓住 (和) {
    警报("❌ 白名单校验失败: " + (和 && 和.消息 ? 和.消息 : 和));
窗.位置.href = "index.html";
    返回;
  }

if （requireAdmin） {
    常量 所有者 = 等待 张.所有者();
if （所有者.toLowerCase（） ！==账户.toLowerCase（）） {
      警报("⚠️ 你不是管理员，将返回首页");
窗.位置.href = "home.html?account=" + 账户;
      返回;
    }
  }

  // ✅ 返回当前账号
  返回 账户;
}
