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

// ==================== MULTI-WALLET PROVIDER DETECTION (EIP-6963) ====================
// window.ethereum 직접 접근 금지! 여러 지갑이 window.ethereum을 덮어쓰려고
// 충돌하면서 "Cannot redefine property: ethereum" 에러가 발생함.
// EIP-6963 이벤트로 각 지갑이 스스로를 등록하게 하고, 그걸 수집한다.

const _eip6963Providers = new Map(); // rdns -> { info, provider }

// EIP-6963: 지갑이 자신을 announce하면 수집
window.addEventListener('eip6963:announceProvider', (event) => {
  const { info, provider } = event.detail;
  if (info?.rdns) _eip6963Providers.set(info.rdns, { info, provider });
});
// 이미 등록된 지갑들에게 announce 요청
window.dispatchEvent(new Event('eip6963:requestProvider'));

// RDNS 매핑
const WALLET_RDNS = {
  metamask: 'io.metamask',
  rabby: 'io.rabby',
  phantom: 'app.phantom',
};

function _safeGetEthereum() {
  // window.ethereum 접근 시 에러 날 수 있으므로 try/catch
  try { return window.ethereum || null; } catch { return null; }
}

function _safeGetProviders() {
  try {
    const eth = _safeGetEthereum();
    return eth?.providers || [];
  } catch { return []; }
}

function findMetaMask() {
  // 1. EIP-6963 (가장 안전)
  const eip = _eip6963Providers.get('io.metamask');
  if (eip) return eip.provider;
  // 2. providers 배열에서 찾기
  const fromArr = _safeGetProviders().find(p => {
    try { return p.isMetaMask && !p.isRabby && !p.isPhantom; } catch { return false; }
  });
  if (fromArr) return fromArr;
  // 3. window.ethereum fallback (단독 설치)
  try {
    const eth = _safeGetEthereum();
    if (eth?.isMetaMask && !eth?.isRabby && !eth?.isPhantom) return eth;
  } catch { /* ignore */ }
  return null;
}

function findRabby() {
  const eip = _eip6963Providers.get('io.rabby');
  if (eip) return eip.provider;
  try { if (window.rabby) return window.rabby; } catch { /* ignore */ }
  const fromArr = _safeGetProviders().find(p => {
    try { return p.isRabby; } catch { return false; }
  });
  if (fromArr) return fromArr;
  try {
    const eth = _safeGetEthereum();
    if (eth?.isRabby) return eth;
  } catch { /* ignore */ }
  return null;
}

function findPhantom() {
  const eip = _eip6963Providers.get('app.phantom');
  if (eip) return eip.provider;
  try { if (window.phantom?.ethereum) return window.phantom.ethereum; } catch { /* ignore */ }
  const fromArr = _safeGetProviders().find(p => {
    try { return p.isPhantom; } catch { return false; }
  });
  if (fromArr) return fromArr;
  return null;
}

function findProviderByName(name) {
  switch (name) {
    case 'metamask': return findMetaMask();
    case 'rabby': return findRabby();
    case 'phantom': return findPhantom();
    default: return null;
  }
}

function findAnyProvider() {
  return findMetaMask() || findRabby() || findPhantom() || _safeGetEthereum();
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

  const body = { walletAddress: addr, signature, nonce };
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
  const nameMap = { 'MetaMask': 'metamask', 'Rabby Wallet': 'rabby', 'Rabby': 'rabby', 'Phantom': 'phantom' };
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
    approved: { cls: 'tr-active', color: 'var(--green)', label: 'Live' },
    pending: { cls: 'tr-filling', color: 'var(--orange)', label: '대기중' },
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
};

function buildWalletButtons(containerId) {
  const container = document.getElementById(containerId || 'walletOptions');
  if (!container) return;

  let html = '';
  for (const [key, info] of Object.entries(WALLET_INFO)) {
    const provider = findProviderByName(key);
    const disabled = !provider;
    // 설치된 지갑: 클릭 가능. 미설치: 비활성화하되 항상 표시
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

// EIP-6963 provider가 뒤늦게 등록될 때 버튼 갱신
window.addEventListener('eip6963:announceProvider', () => {
  buildWalletButtons('walletOptions');
});

// ==================== GLOBAL LOGOUT/DISCONNECT ====================
function doDisconnect() {
  Auth.clear();
  // Close dropdown
  const dd = document.getElementById('walletDropdown');
  if (dd) dd.remove();
  // Reset wallet modal if exists
  const wc = document.getElementById('walletConnect');
  const wi = document.getElementById('walletInfo');
  const wr = document.getElementById('walletRegister');
  if (wc) wc.style.display = '';
  if (wi) wi.style.display = 'none';
  if (wr) wr.style.display = 'none';
  setupNav();
}

function doLogout() {
  doDisconnect();
  location.reload();
}

function toggleWalletDropdown(e) {
  e.stopPropagation();
  let dd = document.getElementById('walletDropdown');
  if (dd) { dd.remove(); return; }

  const roleLabel = { admin: 'Admin', project: 'Project', user: 'User' };
  dd = document.createElement('div');
  dd.id = 'walletDropdown';
  dd.className = 'wallet-dropdown';
  dd.innerHTML = `
    <div class="wd-header">
      <div class="wd-wallet-name">${Auth.walletName || 'Wallet'}</div>
      <div class="wd-role">${roleLabel[Auth.role] || Auth.role || '-'}</div>
    </div>
    <div class="wd-addr">${Auth.wallet || '-'}</div>
    <div class="wd-divider"></div>
    <a href="user.html" class="wd-item">My Dashboard</a>
    ${Auth.isProject || Auth.isAdmin ? '<a href="project.html" class="wd-item">My Campaigns</a>' : ''}
    ${Auth.isAdmin ? '<a href="admin.html" class="wd-item">Admin Panel</a>' : ''}
    <div class="wd-divider"></div>
    <button class="wd-disconnect" onclick="doLogout()">지갑 연결 해제</button>
  `;

  // Position it near the wallet button
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  dd.style.position = 'fixed';
  dd.style.top = (rect.bottom + 8) + 'px';
  dd.style.right = Math.max(12, window.innerWidth - rect.right) + 'px';
  document.body.appendChild(dd);

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function _close(ev) {
      if (!dd.contains(ev.target)) { dd.remove(); document.removeEventListener('click', _close); }
    });
  }, 0);
}

// ==================== NAV SETUP ====================
function setupNav() {
  const linksEl = $('.nav-links');
  if (!linksEl) return;

  let links = `
    <li><a href="index.html#campaigns">Campaigns</a></li>
  `;

  if (Auth.isLoggedIn) {
    if (Auth.isAdmin) links += '<li><a href="admin.html">Admin</a></li>';
    links += '<li><a href="project.html">My Campaigns</a></li>';
    links += '<li><a href="user.html">Dashboard</a></li>';
    links += `<li><button class="wallet-btn connected" onclick="toggleWalletDropdown(event)">${shortAddr(Auth.wallet)}</button></li>`;
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
