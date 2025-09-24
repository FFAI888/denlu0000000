// script.js - v0.07_ui

async function connectWallet() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const chainId = await ethereum.request({ method: 'eth_chainId' });
      if (chainId !== '0x38') {
        showError("请切换到 BSC 主网再连接钱包");
        return;
      }

      showLoading();

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const walletAddress = accounts[0];
      localStorage.setItem('walletAddress', walletAddress);

      const inviterInput = document.getElementById('inviter');
      if (inviterInput) {
        const inviterValue = inviterInput.value;
        localStorage.setItem('inviter', inviterValue);
      }

      hideLoading();
      showToast("连接成功！");
      setTimeout(() => {
        window.location.href = 'relation.html';
      }, 1000);

    } catch (error) {
      hideLoading();
      alert('连接钱包失败！');
      console.error(error);
    }
  } else {
    alert('请安装 MetaMask 钱包插件！');
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  const addr = localStorage.getItem('walletAddress');
  const inviter = localStorage.getItem('inviter');

  const walletEl = document.getElementById('walletAddress');
  if (walletEl && addr) {
    walletEl.innerText = `当前钱包地址：${addr}`;
  }

  const inviterEl = document.getElementById('inviterInfo');
  if (inviterEl && inviter) {
    inviterEl.innerText = `邀请人：${inviter}`;
  }

  if (window.ethereum) {
    const currentChain = await ethereum.request({ method: 'eth_chainId' });
    if (currentChain !== '0x38') {
      showError("请连接 BSC 主网 (Binance Smart Chain)");
    }

    ethereum.on('chainChanged', (chainId) => {
      if (chainId !== '0x38') {
        showError("检测到你切换到了非BSC网络，请切换回BSC主网");
      } else {
        hideError();
      }
    });
  }
});

function showError(msg) {
  const el = document.getElementById('networkError');
  if (el) {
    el.innerText = msg;
    el.style.display = 'block';
  }
}

function hideError() {
  const el = document.getElementById('networkError');
  if (el) {
    el.innerText = '';
    el.style.display = 'none';
  }
}

function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 2000);
}

function goToHome() {
  window.location.href = 'home.html';
}
