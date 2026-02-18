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

// 지갑이 뒤늦게 inject되는 경우를 대비해 한번 더 요청
setTimeout(() => {
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}, 500);

// RDNS 매핑
const WALLET_RDNS = {
  metamask: 'io.metamask',
  rabby: 'io.rabby',
  phantom: 'app.phantom',
};

function _safeGetEthereum() {
  try { return window.ethereum || null; } catch { return null; }
}

function _safeGetProviders() {
  try {
    const eth = _safeGetEthereum();
    return eth?.providers || [];
  } catch { return []; }
}

function findMetaMask() {
  const eip = _eip6963Providers.get('io.metamask');
  if (eip) return eip.provider;
  const fromArr = _safeGetProviders().find(p => {
    try { return p.isMetaMask && !p.isRabby && !p.isPhantom; } catch { return false; }
  });
  if (fromArr) return fromArr;
  try {
    const eth = _safeGetEthereum();
    if (eth?.isMetaMask && !eth?.isRabby && !eth?.isPhantom) return eth;
  } catch {}
  return null;
}

function findRabby() {
  const eip = _eip6963Providers.get('io.rabby');
  if (eip) return eip.provider;
  try { if (window.rabby) return window.rabby; } catch {}
  const fromArr = _safeGetProviders().find(p => {
    try { return p.isRabby; } catch { return false; }
  });
  if (fromArr) return fromArr;
  try {
    const eth = _safeGetEthereum();
    if (eth?.isRabby) return eth;
  } catch {}
  return null;
}

function findPhantom() {
  const eip = _eip6963Providers.get('app.phantom');
  if (eip) return eip.provider;
  try { if (window.phantom?.ethereum) return window.phantom.ethereum; } catch {}
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

  const nonceData = await api('/api/auth/nonce?walletAddress=' + addr);

  if (!nonceData.exists) {
    return { needsRegistration: true, nonce: nonceData.nonce, addr };
  }

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
  } catch {}
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

// 모든 지갑 버튼을 항상 클릭 가능하게 렌더링.
// 프로바이더 감지는 클릭 시점에 다시 수행하므로, 초기 감지 실패해도 OK.
function buildWalletButtons(containerId) {
  const container = document.getElementById(containerId || 'walletOptions');
  if (!container) return;

  let html = '';
  for (const [key, info] of Object.entries(WALLET_INFO)) {
    html += `<button class="wallet-opt" onclick="connectWallet('${key}')">
      <div class="wallet-opt-icon" style="background:linear-gradient(135deg,${info.gradient});">
        <span style="color:white;font-weight:800;font-size:0.7rem;">${info.label}</span>
      </div>
      <div>
        <div class="wallet-opt-name">${info.name}</div>
        <div class="wallet-opt-desc">${info.desc}</div>
      </div>
      ${info.badge ? '<span class="wallet-opt-badge">' + info.badge + '</span>' : ''}
    </button>`;
  }
  container.innerHTML = html;
}

// EIP-6963 provider가 뒤늦게 등록될 때 버튼 갱신
window.addEventListener('eip6963:announceProvider', () => {
  buildWalletButtons('walletOptions');
});

// ==================== CENTRALIZED WALLET CONNECT & REGISTRATION ====================
async function connectWallet(type) {
  // 클릭 시점에 프로바이더 재감지 (초기 빌드 시 놓쳤을 수 있음)
  const provider = findProviderByName(type);
  const walletName = WALLET_INFO[type]?.name || type;
  const errEl = document.getElementById('walletError');
  if (errEl) errEl.style.display = 'none';

  if (!provider) {
    if (errEl) {
      errEl.textContent = walletName + '이(가) 감지되지 않습니다. 확장 프로그램을 설치하고 새로고침하세요.';
      errEl.style.display = 'block';
    }
    return;
  }

  try {
    const result = await authConnect(provider, walletName);
    if (result.needsRegistration) {
      showRegForm(result.nonce, result.addr, provider);
    } else {
      closeModal('walletModal');
      location.reload();
    }
  } catch (e) {
    if (errEl) {
      errEl.textContent = e.code === 4001 ? '사용자가 연결을 거부했습니다.' : (e.message || '연결 실패');
      errEl.style.display = 'block';
    }
  }
}

function showRegForm(nonce, addr, provider) {
  hide('#walletConnect');
  let selectedRole = 'user';
  const regEl = document.getElementById('walletRegister');
  if (!regEl) return;

  regEl.innerHTML = `
    <h3>회원가입</h3>
    <p class="modal-desc">${shortAddr(addr)} 지갑으로 가입합니다.</p>
    <div class="auth-reg">
      <div class="auth-role-picker">
        <button class="auth-role-opt selected" data-role="user" onclick="_selectRegRole(this)">
          <span class="auth-role-icon">&#128100;</span>
          <span class="auth-role-name">일반 유저</span>
          <span class="auth-role-desc">퀘스트 참여 및 보상</span>
        </button>
        <button class="auth-role-opt" data-role="project" onclick="_selectRegRole(this)">
          <span class="auth-role-icon">&#128188;</span>
          <span class="auth-role-name">프로젝트</span>
          <span class="auth-role-desc">캠페인 생성 및 관리</span>
        </button>
      </div>
      <div class="reg-field"><label>이메일 <span id="regEmailTag" style="font-size:0.75rem;color:var(--text-3);">(선택)</span></label><input type="email" id="regEmail" placeholder="name@example.com"></div>
      <div class="reg-field" id="regProjField" style="display:none;"><label>프로젝트 이름 <span style="font-size:0.75rem;color:var(--red);">(필수)</span></label><input type="text" id="regProjName" placeholder="예: AxiomDEX"></div>
      <button class="reg-btn" onclick="_submitReg()">가입하기</button>
    </div>
  `;
  show('#walletRegister');

  window._selectRegRole = function(el) {
    $$('.auth-role-opt').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    selectedRole = el.dataset.role;
    document.getElementById('regProjField').style.display = selectedRole === 'project' ? '' : 'none';
    const tag = document.getElementById('regEmailTag');
    if (tag) {
      tag.textContent = selectedRole === 'project' ? '(필수)' : '(선택)';
      tag.style.color = selectedRole === 'project' ? 'var(--red)' : 'var(--text-3)';
    }
  };

  window._submitReg = async function() {
    const email = document.getElementById('regEmail')?.value?.trim();
    const projName = document.getElementById('regProjName')?.value?.trim();

    if (selectedRole === 'project') {
      if (!email) { alert('프로젝트 역할은 이메일이 필수입니다.'); return; }
      if (!projName) { alert('프로젝트 이름을 입력하세요.'); return; }
    }

    try {
      const regData = { role: selectedRole, email: email || undefined };
      if (selectedRole === 'project') regData.project_name = projName;
      await authSign(addr, nonce, provider, regData);
      closeModal('walletModal');
      location.reload();
    } catch (e) { alert(e.message || '가입 실패'); }
  };
}

// ==================== GLOBAL LOGOUT/DISCONNECT ====================
function doDisconnect() {
  Auth.clear();
  const dd = document.getElementById('walletDropdown');
  if (dd) dd.remove();
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
    ${Auth.isAdmin ? '<a href="admin.html" class="wd-item">Admin Dashboard</a><a href="project.html" class="wd-item">Dashboard</a>' : ''}
    ${Auth.isProject && !Auth.isAdmin ? '<a href="project.html" class="wd-item">Dashboard</a>' : ''}
    ${Auth.isUser ? '<a href="user.html" class="wd-item">My Participations</a>' : ''}
    <div class="wd-divider"></div>
    <button class="wd-disconnect" onclick="doLogout()">지갑 연결 해제</button>
  `;

  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  dd.style.position = 'fixed';
  dd.style.top = (rect.bottom + 8) + 'px';
  dd.style.right = Math.max(12, window.innerWidth - rect.right) + 'px';
  document.body.appendChild(dd);

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

  let links = '<li><a href="index.html#campaigns">Campaigns</a></li>';

  if (Auth.isLoggedIn) {
    if (Auth.isAdmin) {
      links = '<li><a href="admin.html">Admin Dashboard</a></li>'
            + '<li><a href="project.html">Dashboard</a></li>'
            + '<li><a href="index.html#campaigns">Campaigns</a></li>';
    } else if (Auth.isProject) {
      links = '<li><a href="project.html">Dashboard</a></li>'
            + '<li><a href="index.html#campaigns">Campaigns</a></li>';
    } else {
      links = '<li><a href="user.html">My Participations</a></li>'
            + '<li><a href="index.html#campaigns">Campaigns</a></li>';
    }
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
