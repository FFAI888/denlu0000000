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
      showToast("连接失败: " + e.message, "error");
    }
  }else{
    showToast("请安装 MetaMask 或支持 Web3 的钱包", "warning");
  }
}

// ---------------- 链检测（BSC 主网） ----------------
const BSC_CHAIN_ID = "0x38";

async function checkNetwork(){
  if(!window.ethereum){
    showToast("未检测到钱包", "warning");
    return;
  }
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const network = await provider.getNetwork();
  const chainIdHex = "0x" + network.chainId.toString(16);

  if(chainIdHex !== BSC_CHAIN_ID){
    showToast("当前不是 BSC 主网，请切换网络！", "error");
  }else{
    showToast("已连接到 BSC 主网", "success");
  }
}

// ---------------- 弹窗提示（队列机制） ----------------
let toastQueue = [];
let toastActive = false;

function showToast(msg, type){
  toastQueue.push({ msg, type });
  if(!toastActive){
    displayNextToast();
  }
}

function displayNextToast(){
  if(toastQueue.length === 0){
    toastActive = false;
    return;
  }

  toastActive = true;
  const { msg, type } = toastQueue.shift();

  const box = document.getElementById("toastBox");
  if(!box) return;

  const div = document.createElement("div");
  div.className = "toast " + type;

  let icon = "";
  if(type === "success") icon = "✅";
  if(type === "error")   icon = "❌";
  if(type === "warning") icon = "⚠️";

  div.innerHTML = `<span class="icon">${icon}</span><span>${msg}</span>`;
  box.appendChild(div);

  // 显示3秒后退出动画
  setTimeout(()=>{
    div.classList.add("hide");
    setTimeout(()=>{
      div.remove();
      displayNextToast(); // 播放下一个提示
    }, 300);
  }, 3000);
}

// ---------------- 白名单 & 管理员检测 ----------------
const WHITELIST_ADDR = "0xYourContractAddressHere";
const ABI = [
  "function isWhitelisted(address) view returns (bool)",
  "function owner() view returns (address)"
];

async function checkWhitelist(addr, elementId){
  try{
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(WHITELIST_ADDR, ABI, provider);
    const status = await contract.isWhitelisted(addr);
    document.getElementById(elementId).innerText = status ? "✅ 已在白名单" : "❌ 不在白名单";
  }catch(e){
    console.error("白名单检测失败:", e);
    document.getElementById(elementId).innerText = "检测失败";
  }
}

async function checkAdmin(addr, elementId){
  try{
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(WHITELIST_ADDR, ABI, provider);
    const owner = await contract.owner();
    document.getElementById(elementId).innerText =
      addr.toLowerCase() === owner.toLowerCase()
      ? "✅ 你是管理员"
      : "❌ 你不是管理员";
  }catch(e){
    console.error("管理员检测失败:", e);
    document.getElementById(elementId).innerText = "检测失败";
  }
}
