// version: v1.02

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

/*********** 主题：存取与应用（锁定/解除） ***********/
const THEME_KEY = "themeColors";
const THEME_LOCK = "themeLocked";

function applyCssTheme(main, secondary){
  const root = document.documentElement;
  if(main)      root.style.setProperty("--theme-main", main);
  if(secondary) root.style.setProperty("--theme-secondary", secondary);
  // 同时更新渐变层背景（与 v1.01 兼容保留）
  const target = document.querySelector("#bgColor");
  if(target) target.style.background = `linear-gradient(135deg, ${getComputedStyle(root).getPropertyValue("--theme-main").trim()}, ${getComputedStyle(root).getPropertyValue("--theme-secondary").trim()})`;
}

function saveThemeColors(main, secondary){
  localStorage.setItem(THEME_KEY, JSON.stringify({ main, secondary }));
  localStorage.setItem(THEME_LOCK, "1");
}
function loadThemeColors(){
  try { return JSON.parse(localStorage.getItem(THEME_KEY)); } catch(e){ return null; }
}
function clearThemeColors(){
  localStorage.removeItem(THEME_KEY);
  localStorage.removeItem(THEME_LOCK);
}
function isThemeLocked(){ return localStorage.getItem(THEME_LOCK) === "1"; }

/*********** 图片取色 → 渐变 ***********/
function toHex(c){ return c.toString(16).padStart(2,"0"); }
function rgbToHex(r,g,b){ return `#${toHex(r)}${toHex(g)}${toHex(b)}`; }
function dist2(a,b){ const dr=a[0]-b[0], dg=a[1]-b[1], db=a[2]-b[2]; return dr*dr+dg*dg+db*db; }

function extractPalette(imgEl){
  const w = 48, h = 48;
  const cvs = document.createElement("canvas"); cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(imgEl, 0, 0, w, h);
  const data = ctx.getImageData(0,0,w,h).data;

  const map = new Map();
  for(let i=0;i<data.length;i+=4){
    const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
    if (a < 128) continue;
    const key = ((r>>4)<<8) | ((g>>4)<<4) | (b>>4);
    const rec = map.get(key) || {count:0, sum:[0,0,0]};
    rec.count++; rec.sum[0]+=r; rec.sum[1]+=g; rec.sum[2]+=b;
    map.set(key, rec);
  }

  const arr = [];
  map.forEach((v)=> arr.push({ c:v.count, avg:[(v.sum[0]/v.count)|0,(v.sum[1]/v.count)|0,(v.sum[2]/v.count)|0] }));
  arr.sort((a,b)=> b.c-a.c);
  const top = arr.slice(0,10);

  const main = top.length ? top[0].avg : [13,27,42];
  let sec = [27,38,59], maxD = -1;
  for(let i=1;i<top.length;i++){
    const d = dist2(top[i].avg, main);
    if(d>maxD){ maxD=d; sec=top[i].avg; }
  }
  return { main: rgbToHex(main[0],main[1],main[2]),
           secondary: rgbToHex(sec[0],sec[1],sec[2]) };
}

function applyGradientFromImage(imgPath){
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = ()=>{
    const {main, secondary} = extractPalette(img);
    applyCssTheme(main, secondary);
    // 若未锁定，仅应用但不保存；锁定时会使用按钮保存
  };
  img.onerror = ()=>{
    // 保持 CSS 默认变量，不抛错
  };
  img.src = imgPath;
}

/*********** 锁定/解除 操作 ***********/
function lockCurrentTheme(){
  const styles = getComputedStyle(document.documentElement);
  const main = styles.getPropertyValue("--theme-main").trim();
  const secondary = styles.getPropertyValue("--theme-secondary").trim();
  if(main && secondary){
    saveThemeColors(main, secondary);
    // 已锁定即持久化，不做其它改动
  }
}
function unlockTheme(){
  clearThemeColors();
  // 解除后重新按图片取色应用
  applyGradientFromImage("./tupian/bg.jpg");
}

/*********** 初始化 ***********/
function bindThemeButtons(){
  const lockBtn = document.getElementById("lockThemeBtn");
  if(lockBtn) lockBtn.onclick = lockCurrentTheme;
  const unlockBtn = document.getElementById("unlockThemeBtn");
  if(unlockBtn) unlockBtn.onclick = unlockTheme;
}

function initTheme(){
  const stored = loadThemeColors();
  if (isThemeLocked() && stored && stored.main && stored.secondary){
    applyCssTheme(stored.main, stored.secondary);   // 使用锁定主题
  } else {
    applyGradientFromImage("./tupian/bg.jpg");      // 自动取色
  }
}

window.addEventListener("DOMContentLoaded", ()=>{
  guardPages();
  bindThemeButtons();
  initTheme();
});
