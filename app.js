// version: v1.01

/*********** 会话：登录/退出 ***********/
async function connectWallet() {
  const status = document.getElementById("status");
  if (!window.ethereum) {
    if (status) status.textContent = "状态：请安装钱包（MetaMask/OKX）或用钱包浏览器打开";
    return;
  }
  try {
    let accounts = [];
    if (typeof window.ethereum.request === "function") {
      accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    } else {
      const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      accounts = await provider.send("eth_requestAccounts", []);
    }
    if (!accounts.length) {
      if (status) status.textContent = "状态：没有获取到账户";
      return;
    }
    const addr = accounts[0];
    if (status) status.textContent = "状态：已连接 " + addr;
    localStorage.setItem("sessionAddr", addr);
    window.location.href = "home.html";
  } catch (err) {
    if (status) status.textContent = "状态：连接失败 - " + (err.message || err);
  }
}

function logout(){
  localStorage.removeItem("sessionAddr");
  window.location.href = "index.html";
}

/*********** 页面守卫 ***********/
function guardPages(){
  const path = window.location.pathname;
  if(path.endsWith("index.html") || path.endsWith("/")){
    const btn = document.getElementById("connectBtn");
    if(btn) btn.onclick = connectWallet;
  }
  if(path.endsWith("home.html")){
    const addr = localStorage.getItem("sessionAddr");
    if(!addr){ window.location.href="index.html"; return; }
    const el = document.getElementById("addrLine");
    if(el) el.textContent = "地址：" + addr;
  }
}

/*********** ✅ 图片取色 → 渐变背景 ***********/
/* 思路：
   1) 将 tupian/bg.jpg 绘制到一个小画布(如 48x48)
   2) 做 4bit/通道的颜色量化，统计频次，选 Top1 为主色，挑一个色差较大的当次色
   3) 生成线性渐变，覆盖到 #bgColor
*/
function toHex(c){ const s = c.toString(16).padStart(2,"0"); return s; }
function rgbToHex(r,g,b){ return `#${toHex(r)}${toHex(g)}${toHex(b)}`; }
function dist2(a,b){ const dr=a[0]-b[0], dg=a[1]-b[1], db=a[2]-b[2]; return dr*dr+dg*dg+db*db; }

function extractPalette(imgEl){
  const w = 48, h = 48;
  const cvs = document.createElement("canvas"); cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(imgEl, 0, 0, w, h);
  const data = ctx.getImageData(0,0,w,h).data;

  // 量化：每通道 4bit（0..15），共 4096 桶
  const map = new Map();
  for(let i=0;i<data.length;i+=4){
    const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
    if (a < 128) continue; // 忽略透明像素
    const rq = r>>4, gq = g>>4, bq = b>>4;
    const key = (rq<<8) | (gq<<4) | bq;
    const rec = map.get(key) || {count:0, sum:[0,0,0]};
    rec.count++;
    rec.sum[0]+=r; rec.sum[1]+=g; rec.sum[2]+=b;
    map.set(key, rec);
  }

  // 选 Top N（按频次）
  const arr = [];
  map.forEach((v,k)=> arr.push({k, c:v.count, avg:[(v.sum[0]/v.count)|0,(v.sum[1]/v.count)|0,(v.sum[2]/v.count)|0]}));
  arr.sort((a,b)=> b.c-a.c);
  const top = arr.slice(0,10);

  // 主色 = Top1，次色 = 与主色色差最大的一个
  const main = top.length ? top[0].avg : [13,27,42]; // 默认海军蓝
  let sec = [27,38,59];
  let maxD = -1;
  for(let i=1;i<top.length;i++){
    const d = dist2(top[i].avg, main);
    if(d > maxD){ maxD = d; sec = top[i].avg; }
  }
  return { main: rgbToHex(main[0],main[1],main[2]),
           secondary: rgbToHex(sec[0],sec[1],sec[2]) };
}

function applyGradientFromImage(imgPath, targetSel = "#bgColor"){
  const img = new Image();
  img.crossOrigin = "anonymous"; // 同源时无影响，跨域时尝试放行
  img.onload = ()=>{
    const {main, secondary} = extractPalette(img);
    const target = document.querySelector(targetSel);
    if(target){
      target.style.background = `linear-gradient(135deg, ${main}, ${secondary})`;
    }
  };
  img.onerror = ()=>{
    // 失败时保留默认渐变（style.css 里已有）
  };
  img.src = imgPath;
}

/*********** 初始化 ***********/
window.addEventListener("DOMContentLoaded", ()=>{
  // 统一守卫
  guardPages();
  // 从你的背景图片提色并应用渐变
  applyGradientFromImage("./tupian/bg.jpg", "#bgColor");
});
