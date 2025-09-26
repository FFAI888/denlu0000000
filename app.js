// 存储和获取钱包地址
function setWalletAddress(addr){
  localStorage.setItem("walletAddress", addr);
}
function getWalletAddress(){
  return localStorage.getItem("walletAddress");
}

// 连接钱包
async function connectWallet(){
  if(window.ethereum){
    try{
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const addr = await signer.getAddress();

      setWalletAddress(addr);
      const el = document.getElementById("walletAddress");
      if(el) el.innerText = "✅ 已连接: " + addr;

    }catch(e){
      showToast("❌ 连接失败: " + e.message, "error");
    }
  }else{
    showToast("⚠️ 请安装 MetaMask 或支持 Web3 的钱包", "warning");
  }
}

// ---------------- 链检测（只支持 BSC 主网） ----------------
const BSC_CHAIN_ID = "0x38"; // BSC 主网 Chain ID

async function checkNetwork(){
  if(!window.ethereum){
    showToast("⚠️ 未检测到钱包", "warning");
    return;
  }
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const network = await provider.getNetwork();
  const chainIdHex = "0x" + network.chainId.toString(16);

  if(chainIdHex !== BSC_CHAIN_ID){
    showToast("❌ 当前不是 BSC 主网，请切换网络！", "error");
  }else{
    showToast("✅ 已连接到 BSC 主网", "success");
  }
}

// ---------------- 弹窗提示 ----------------
let toastDelay = false;
function showToast(msg, type){
  if(toastDelay) return; // 延迟1秒避免重叠
  toastDelay = true;
  setTimeout(()=> toastDelay=false, 1000);

  const box = document.getElementById("toastBox");
  if(!box) return;

  const div = document.createElement("div");
  div.className = "toast " + type;
  div.innerText = msg;
  box.appendChild(div);

  // 3秒后自动消失
  setTimeout(()=>{
    div.remove();
  }, 3000);
}
