// ==================== SHILL VAULT — Shared App Module ====================
const API = 'https://shill-vault-api.vercel.app';

// ==================== AUTH STATE ====================
const Auth = {
  token: localStorage.getItem('sv_token'),
  user: JSON.parse(localStorage.getItem('sv_user') || 'null'),
  wallet: localStorage.getItem('sv_wallet'),
  walletName: localStorage.getItem('sv_wallet_name'),
  provider: null,

  save(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('sv_token', token);
    localStorage.setItem('sv_user', JSON.stringify(user));
  },

  clear() {
    this.token = null;
    this.user = null;
    this.wallet = null;
    this.walletName = null;
    this.provider = null;
    localStorage.removeItem('sv_token');
    localStorage.removeItem('sv_user');
    localStorage.removeItem('sv_wallet');
    localStorage.removeItem('sv_wallet_name');
  },

  get isLoggedIn() { return !!this.token && !!this.user; },
  get role() { return this.user?.role || null; },
  get isAdmin() { return this.role === 'admin'; },
  get isProject() { return this.role === 'project'; },
  get isUser() { return this.role === 'user'; },
};

// ==================== API CLIENT ====================
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (Auth.token) headers['Authorization'] = 'Bearer ' + Auth.token;
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, message: data.error || 'Request failed' };
  return data;
}

// ==================== WALLET HELPERS ====================
const CHAINS = {
  '0x1': 'Ethereum', '0x89': 'Polygon', '0xa4b1': 'Arbitrum', '0x2105': 'Base',
  '0x38': 'BNB Chain', '0xa': 'Optimism', '0xa86a': 'Avalanche',
};

function shortAddr(addr) { return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : ''; }

async function getChainName(provider) {
  try {
    const id = await provider.request({ method: 'eth_chainId' });
    return CHAINS[id] || 'Chain ' + parseInt(id, 16);
  } catch { return 'Unknown'; }
}

async function getBalance(provider, addr) {
  try {
    const raw = await provider.request({ method: 'eth_getBalance', params: [addr, 'latest'] });
    const eth = parseInt(raw, 16) / 1e18;
    return eth < 0.0001 ? '0 ETH' : eth.toFixed(4) + ' ETH';
  } catch { return '— ETH'; }
}

// ==================== MULTI-WALLET PROVIDER DETECTION ====================
// Multiple wallet extensions (MetaMask, Rabby, Phantom, Kaia) all try to set
// window.ethereum, causing "Cannot redefine property: ethereum" errors.
// Each wallet must be found via its own dedicated path.

function getProviders() {
  // Some wallets populate window.ethereum.providers array
  return window.ethereum?.providers || [];
}

function findMetaMask() {
  // 1. Check providers array (when multiple wallets coexist)
  const fromProviders = getProviders().find(p => p.isMetaMask && !p.isRabby && !p.isPhantom);
  if (fromProviders) return fromProviders;
  // 2. Check window.ethereum directly (single wallet case)
  if (window.ethereum?.isMetaMask && !window.ethereum?.isRabby && !window.ethereum?.isPhantom) return window.ethereum;
  return null;
}

function findRabby() {
  // 1. Rabby sets its own global
  if (window.rabby) return window.rabby;
  // 2. Check providers array
  const fromProviders = getProviders().find(p => p.isRabby);
  if (fromProviders) return fromProviders;
  // 3. Check window.ethereum
  if (window.ethereum?.isRabby) return window.ethereum;
  return null;
}

function findPhantom() {
  // Phantom (EVM mode) sets window.phantom.ethereum
  if (window.phantom?.ethereum) return window.phantom.ethereum;
  // Check providers array
  const fromProviders = getProviders().find(p => p.isPhantom);
  if (fromProviders) return fromProviders;
  if (window.ethereum?.isPhantom) return window.ethereum;
  return null;
}

function findKaia() {
  // Kaia Wallet (formerly Klaytn/Kaikas) sets window.klaytn or window.kaia
  if (window.kaia) return window.kaia;
  if (window.klaytn) return window.klaytn;
  const fromProviders = getProviders().find(p => p.isKaikas || p.isKaia);
  if (fromProviders) return fromProviders;
  return null;
}

function findProviderByName(name) {
  switch (name) {
    case 'metamask': return findMetaMask();
    case 'rabby': return findRabby();
    case 'phantom': return findPhantom();
    case 'kaia': return findKaia();
    default: return null;
  }
}

function findAnyProvider() {
  return findMetaMask() || findRabby() || findPhantom() || findKaia() || window.ethereum || null;
}

// ==================== AUTH FLOW ====================
async function authConnect(provider, walletName) {
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  const addr = accounts[0];
  if (!addr) throw new Error('No account');

  Auth.provider = provider;
  Auth.wallet = addr;
  Auth.walletName = walletName;
  localStorage.setItem('sv_wallet', addr);
  localStorage.setItem('sv_wallet_name', walletName);

  // Check if user exists
  const nonceData = await api('/api/auth/nonce?walletAddress=' + addr);

  if (!nonceData.exists) {
    // New user — need registration
    return { needsRegistration: true, nonce: nonceData.nonce, addr };
  }

  // Existing user — sign and login
  return await authSign(addr, nonceData.nonce, provider);
}

async function authSign(addr, nonce, provider, regData = null) {
  const message = 'Sign this message to authenticate with SHILL VAULT.\n\nNonce: ' + nonce;
  const signature = await provider.request({ method: 'personal_sign', params: [message, addr] });

  const body = { walletAddress: addr, signature };
  if (regData) Object.assign(body, regData);

  const data = await api('/api/auth/verify', { method: 'POST', body: JSON.stringify(body) });
  Auth.save(data.token, data.user);
  return { needsRegistration: false, user: data.user, isNew: data.isNew };
}

async function authRestore() {
  const saved = localStorage.getItem('sv_wallet');
  const name = localStorage.getItem('sv_wallet_name');
  if (!saved) return false;

  // Find the correct provider based on previously used wallet
  const nameMap = { 'MetaMask': 'metamask', 'Rabby': 'rabby', 'Phantom': 'phantom', 'Kaia': 'kaia' };
  const provider = findProviderByName(nameMap[name] || '') || findAnyProvider();
  if (!provider) return false;

  try {
    const accounts = await provider.request({ method: 'eth_accounts' });
    const match = accounts.find(a => a.toLowerCase() === saved.toLowerCase());
    if (match) {
      Auth.provider = provider;
      Auth.wallet = match;
      Auth.walletName = name || 'Wallet';
      return true;
    }
  } catch { /* silent */ }
  return false;
}

// ==================== UI HELPERS ====================
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }
function show(el) { if (typeof el === 'string') el = $(el); if (el) el.style.display = ''; }
function hide(el) { if (typeof el === 'string') el = $(el); if (el) el.style.display = 'none'; }

function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function statusBadge(status) {
  const map = {
    active: { cls: 'tr-active', color: 'var(--green)', label: '진행중' },
    live: { cls: 'tr-active', color: 'var(--green)', label: 'Live' },
    approved: { cls: 'tr-filling', color: 'var(--blue)', label: '승인됨' },
    pending: { cls: 'tr-filling', color: 'var(--orange)', label: '심사중' },
    rejected: { cls: 'tr-completed', color: 'var(--red)', label: '반려' },
    ended: { cls: 'tr-completed', color: 'var(--text-3)', label: '종료' },
    joined: { cls: 'tr-filling', color: 'var(--blue)', label: '참여중' },
    completed: { cls: 'tr-active', color: 'var(--green)', label: '완료' },
    rewarded: { cls: 'tr-active', color: 'var(--purple)', label: '보상지급' },
  };
  const m = map[status] || { cls: 'tr-completed', color: 'var(--text-3)', label: status };
  return `<span class="tr-status ${m.cls}"><span class="dot" style="width:5px;height:5px;border-radius:50%;background:${m.color};"></span>${m.label}</span>`;
}

function formatDate(d) { return d ? new Date(d).toLocaleDateString('ko-KR') : '-'; }
function formatNum(n) { return (n || 0).toLocaleString(); }

// ==================== WALLET UI BUILDER ====================
const WALLET_INFO = {
  metamask: { name: 'MetaMask', desc: '브라우저 확장 지갑', gradient: '#f6851b,#e2761b', label: 'MM', badge: '인기' },
  rabby:    { name: 'Rabby Wallet', desc: 'EVM 멀티체인 지갑', gradient: '#7084ff,#5c6fff', label: 'RB', badge: null },
  phantom:  { name: 'Phantom', desc: 'Solana & EVM 지갑', gradient: '#ab9ff2,#6e56cf', label: 'PH', badge: null },
  kaia:     { name: 'Kaia Wallet', desc: 'Kaia 네트워크 지갑', gradient: '#3f51b5,#5c6bc0', label: 'KA', badge: null },
};

function buildWalletButtons(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let html = '';
  for (const [key, info] of Object.entries(WALLET_INFO)) {
    const provider = findProviderByName(key);
    const disabled = !provider;
    html += `<button class="wallet-opt${disabled ? ' wc-disabled' : ''}" onclick="${disabled ? '' : "connectWallet('" + key + "')"}" ${disabled ? 'title="설치되지 않음"' : ''}>
      <div class="wallet-opt-icon" style="background:linear-gradient(135deg,${info.gradient});">
        <span style="color:white;font-weight:800;font-size:0.7rem;">${info.label}</span>
      </div>
      <div>
        <div class="wallet-opt-name">${info.name}</div>
        <div class="wallet-opt-desc">${disabled ? '미설치' : info.desc}</div>
      </div>
      ${info.badge && !disabled ? '<span class="wallet-opt-badge">' + info.badge + '</span>' : ''}
      ${disabled ? '<span class="wallet-opt-badge wc-soon">미설치</span>' : ''}
    </button>`;
  }
  container.innerHTML = html;
}

// ==================== NAV SETUP ====================
function setupNav() {
  const linksEl = $('.nav-links');
  if (!linksEl) return;

  // Build nav based on auth state
  let links = `
    <li><a href="index.html#quests">Quests</a></li>
    <li><a href="index.html#campaigns">Campaigns</a></li>
  `;

  if (Auth.isLoggedIn) {
    if (Auth.isAdmin) links += '<li><a href="admin.html">Admin</a></li>';
    if (Auth.isProject) links += '<li><a href="project.html">My Campaigns</a></li>';
    links += '<li><a href="user.html">Dashboard</a></li>';
    links += `<li><button class="wallet-btn connected" onclick="openModal('walletModal')">${shortAddr(Auth.wallet)}</button></li>`;
  } else {
    links += `<li><button class="wallet-btn" onclick="openModal('walletModal')">지갑 연결</button></li>`;
  }
  linksEl.innerHTML = links;
}

// ==================== COMMON INIT ====================
function initCommon() {
  // Scroll reveal
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  $$('.rv').forEach(el => obs.observe(el));

  // Nav scroll
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('nav');
    if (nav) nav.classList.toggle('scrolled', scrollY > 50);
  });

  // Modal backdrop close
  $$('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
  });

  // Mobile menu
  $$('.nav-links a').forEach(a => {
    a.addEventListener('click', () => $('.nav-links')?.classList.remove('active'));
  });

  // Build wallet buttons dynamically
  buildWalletButtons('walletOptions');

  setupNav();
}
