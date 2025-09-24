// script.js - v0.01

// 登录页：连接钱包
async function connectWallet() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const walletAddress = accounts[0];
      localStorage.setItem('walletAddress', walletAddress);
      window.location.href = 'relation.html';
    } catch (error) {
      alert('连接钱包失败！');
      console.error(error);
    }
  } else {
    alert('请安装 MetaMask 钱包插件！');
  }
}

// 关系页：加载钱包地址并确认跳转
document.addEventListener('DOMContentLoaded', function () {
  const addr = localStorage.getItem('walletAddress');
  const walletEl = document.getElementById('walletAddress');
  if (walletEl && addr) {
    walletEl.innerText = `当前钱包地址：${addr}`;
  }
});

function goToHome() {
  window.location.href = 'home.html';
}
