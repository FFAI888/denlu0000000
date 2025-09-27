// version: v0.04 —— 同步版本号；BSC 守卫与弹窗逻辑保持不变

const APP_VERSION = "v0.04";
const LS_SESSION  = "session-min"; // { addr, ts }
const BSC_HEX     = "0x38";        // 56
const BSC_DEC     = 56;

/* 版本徽章 */
function setVersionBadge(){ const el=document.getElementById("verBadge"); if(el) el.textContent=APP_VERSION; }

/* 会话 */
function saveSession(addr){ localStorage.setItem(LS_SESSION, JSON.stringify({ addr, ts: Date.now() })); }
function loadSession(){ try{ return JSON.parse(localStorage.getItem(LS_SESSION)); }catch(e){ return null; } }
function clearSession(){ localStorage.removeItem(LS_SESSION); }

/* 弹窗 */
function showToast(msg, type="info", ms=2600){
  const el = document.getElementById("toast");
  if(!el) return;
  el.classList.remove("warn","success","error");
  if(type==="warn") el.classList.add("warn");
  else if(type==="success") el.classList.add("success");
  else if(type==="error") el.classList.add("error");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el.__timer);
  el.__timer = setTimeout(()=> el.classList.remove("show"), ms);
}

/* provider/网络 */
async function getChainIdHex(){
  if(!window.ethereum) return null;
  try{
    if(typeof window.ethereum.request === "function")
      return await window.ethereum.request({ method:"eth_chainId" });
    return null;
  }catch(e){ return null; }
}

/* 登录页：连接钱包（仅允许 BSC） */
async function connectWallet(){
  const status = document.getElementById("status");
  const say = t => { if(status) status.textContent = "状态：" + t; };

  if(!window.ethereum || typeof window.ethereum.request !== "function"){
    say("未检测到钱包。请用钱包内置浏览器打开"); showToast("未检测到钱包，请在 MetaMask/OKX 内置浏览器打开","warn"); return;
  }
  const cid = await getChainIdHex();
  if(!cid){
    showToast("无法识别当前网络，请在钱包里切换到 BSC 主网（56）后重试","warn");
  }else if(cid.toLowerCase() !== BSC_HEX){
    showToast(`仅支持 BSC 主网（56）。当前网络：${cid}`,"warn");
    say("请切换到 BSC 主网后再连接"); return;
  }

  try{
    const accounts = await window.ethereum.request({ method:"eth_requestAccounts" });
    if(!accounts || !accounts.length){ say("未授权账户"); showToast("未授权账户","warn"); return; }
    const addr = accounts[0];
    saveSession(addr);
    say("已连接 "+addr.slice(0,6)+"..."+addr.slice(-4));
    showToast("连接成功，正在进入首页…","success",1400);
    setTimeout(()=> location.href="home.html", 500);
  }catch(err){
    say("连接失败：" + (err?.message || String(err)));
    showToast("连接失败："+(err?.message || String(err)), "error", 3000);
  }
}

/* 首页守卫 + 账号/链监控 */
async function guardHome(){
  const sess = loadSession();
  if(!sess || !sess.addr){ location.href="index.html"; return; }

  const line = document.getElementById("addrLine"); if(line) line.textContent = "地址：" + sess.addr;

  const netLine = document.getElementById("netLine");
  const cid = await getChainIdHex();
  if(cid && netLine) netLine.textContent = (cid.toLowerCase()===BSC_HEX) ? "网络：BSC（56）" : `网络：${cid}（不支持）`;

  if(!cid || cid.toLowerCase() !== BSC_HEX){
    showToast("仅支持 BSC 主网。已退出，请切换网络后重新登录","error", 2600);
    setTimeout(()=>{ clearSession(); location.href="index.html"; }, 1000);
    return;
  }

  const btn = document.getElementById("logoutBtn");
  if(btn) btn.onclick = ()=>{ clearSession(); location.href="index.html"; };

  if(window.ethereum && typeof window.ethereum.on === "function"){
    window.ethereum.on("chainChanged", (newCid)=>{
      if(!newCid || String(newCid).toLowerCase() !== BSC_HEX){
        showToast("检测到网络切换，当前非 BSC，已退出","warn", 2400);
        clearSession(); location.href="index.html";
      }
    });
    window.ethereum.on("accountsChanged", (accs)=>{
      const current = accs && accs[0] ? accs[0].toLowerCase() : "";
      if(!current || current !== String(sess.addr||"").toLowerCase()){
        showToast("账户已切换，需重新登录","warn", 2200);
        clearSession(); location.href="index.html";
      }
    });
  }

  setInterval(async ()=>{
    const xc = await getChainIdHex();
    if(!xc || xc.toLowerCase() !== BSC_HEX){
      showToast("检测到网络非 BSC，已退出","warn", 2200);
      clearSession(); location.href="index.html";
    }
  }, 10000);
}

/* 登录页提示守卫 */
async function guardLogin(){
  if(!window.ethereum){ showToast("未检测到钱包，请在钱包内置浏览器打开","warn"); return; }
  const cid = await getChainIdHex();
  if(!cid) showToast("无法识别当前网络，请在钱包里切换到 BSC（56）","warn");
  else if(cid.toLowerCase() !== BSC_HEX) showToast(`仅支持 BSC（56）。当前：${cid}`,"warn");

  const btn = document.getElementById("connectBtn");
  if(btn) btn.onclick = connectWallet;

  if(window.ethereum && typeof window.ethereum.on === "function"){
    window.ethereum.on("chainChanged", (newCid)=>{
      if(!newCid) return;
      if(String(newCid).toLowerCase() === BSC_HEX) showToast("已切换到 BSC 主网，可以连接了","success", 1600);
      else showToast(`当前网络 ${newCid} 不支持，请切到 BSC（56）`,`warn`, 2400);
    });
  }
}

/* 启动入口 */
document.addEventListener("DOMContentLoaded", ()=>{
  setVersionBadge();
  const isLogin = location.pathname.endsWith("index.html") || /\/$/.test(location.pathname);
  if (isLogin) guardLogin(); else guardHome();
});
