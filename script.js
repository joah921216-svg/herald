// ==================== SCROLL REVEAL ====================
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
}, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
document.querySelectorAll('.rv').forEach(el => obs.observe(el));

// Nav scroll
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', scrollY > 50);
});

// Mobile menu close on link click
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => document.querySelector('.nav-links').classList.remove('active'));
});

// Close lang dropdown on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.lang-sw')) document.querySelector('.lang-drop')?.classList.remove('open');
});

// ==================== MODAL ====================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// ==================== WALLET CONNECTION ====================
let connectedAddr = null;
let connectedWallet = null;
let activeProvider = null;

const CHAINS = {
  '0x1': 'Ethereum', '0x89': 'Polygon', '0xa4b1': 'Arbitrum', '0x2105': 'Base',
  '0x38': 'BNB Chain', '0xa': 'Optimism', '0xa86a': 'Avalanche', '0xe708': 'Linea',
  '0x144': 'zkSync Era', '0x82750': 'Scroll'
};

function showWalletError(msg) {
  const el = document.getElementById('walletError');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function setOptLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) btn.classList.add('loading');
  else btn.classList.remove('loading');
}

async function connectMetaMask() {
  if (typeof window.ethereum === 'undefined') {
    showWalletError(i18n[currentLang].wm_no_mm || 'MetaMask is not installed.');
    setTimeout(() => window.open('https://metamask.io/download/', '_blank'), 1500);
    return;
  }
  setOptLoading('mmBtn', true);
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accounts[0]) {
      activeProvider = window.ethereum;
      await onWalletConnected(accounts[0], 'MetaMask');
    }
  } catch (err) {
    if (err.code === 4001) showWalletError(i18n[currentLang].wm_rejected || '사용자가 연결을 거부했습니다.');
    else showWalletError(i18n[currentLang].wm_error || '연결에 실패했습니다. 다시 시도해주세요.');
    console.error('MetaMask connection failed:', err);
  }
  setOptLoading('mmBtn', false);
}

async function connectRabby() {
  const provider = window.rabby || window.ethereum?.providers?.find(p => p.isRabby) || window.ethereum;
  if (!provider) {
    showWalletError(i18n[currentLang].wm_no_wallet || 'Web3 지갑이 감지되지 않습니다.');
    setTimeout(() => window.open('https://rabby.io/', '_blank'), 1500);
    return;
  }
  setOptLoading('rbBtn', true);
  try {
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    if (accounts[0]) {
      activeProvider = provider;
      await onWalletConnected(accounts[0], 'Rabby');
    }
  } catch (err) {
    if (err.code === 4001) showWalletError(i18n[currentLang].wm_rejected || '사용자가 연결을 거부했습니다.');
    else showWalletError(i18n[currentLang].wm_error || '연결에 실패했습니다. 다시 시도해주세요.');
    console.error('Rabby connection failed:', err);
  }
  setOptLoading('rbBtn', false);
}

function connectWalletConnect() {
  showWalletError(i18n[currentLang].wm_wc_soon || 'WalletConnect는 준비 중입니다. MetaMask 또는 Rabby를 이용해주세요.');
}

async function getChainName(provider) {
  try {
    const chainId = await provider.request({ method: 'eth_chainId' });
    return CHAINS[chainId] || 'Chain ' + parseInt(chainId, 16);
  } catch { return 'Unknown'; }
}

async function getBalance(provider, addr) {
  try {
    const raw = await provider.request({ method: 'eth_getBalance', params: [addr, 'latest'] });
    const wei = parseInt(raw, 16);
    const eth = wei / 1e18;
    return eth < 0.0001 ? '0 ETH' : eth.toFixed(4) + ' ETH';
  } catch { return '— ETH'; }
}

async function onWalletConnected(addr, walletName) {
  connectedAddr = addr;
  connectedWallet = walletName;
  const short = addr.slice(0, 6) + '...' + addr.slice(-4);
  const provider = activeProvider || window.ethereum;

  // Nav button
  const btn = document.getElementById('walletBtn');
  btn.classList.add('connected');
  btn.innerHTML = '<span class="wallet-addr">' + short + '</span>';
  btn.onclick = () => openModal('walletModal');

  // Modal: hide connect, show info
  document.getElementById('walletConnect').style.display = 'none';
  document.getElementById('walletInfo').style.display = 'block';
  document.getElementById('wiName').textContent = walletName;
  document.getElementById('wiAddr').textContent = short;

  // Chain & balance
  const chain = await getChainName(provider);
  document.getElementById('wiChain').textContent = chain;
  const bal = await getBalance(provider, addr);
  document.getElementById('wiBalance').textContent = bal;

  // Persist
  localStorage.setItem('sv_wallet_addr', addr);
  localStorage.setItem('sv_wallet_name', walletName);
}

function disconnectWallet() {
  connectedAddr = null;
  connectedWallet = null;
  activeProvider = null;
  localStorage.removeItem('sv_wallet_addr');
  localStorage.removeItem('sv_wallet_name');

  // Nav button reset
  const btn = document.getElementById('walletBtn');
  btn.classList.remove('connected');
  btn.textContent = i18n[currentLang].nav_wallet;
  btn.onclick = () => openModal('walletModal');

  // Modal: show connect, hide info
  document.getElementById('walletConnect').style.display = 'block';
  document.getElementById('walletInfo').style.display = 'none';

  closeModal('walletModal');
}

function copyAddress() {
  if (connectedAddr) {
    navigator.clipboard.writeText(connectedAddr).then(() => {
      const btn = document.querySelector('.wci-copy');
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
      setTimeout(() => {
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
      }, 1500);
    });
  }
}

// Listen for account/chain changes
if (window.ethereum) {
  window.ethereum.on?.('accountsChanged', (accounts) => {
    if (accounts.length === 0) disconnectWallet();
    else if (connectedAddr) onWalletConnected(accounts[0], connectedWallet || 'Wallet');
  });
  window.ethereum.on?.('chainChanged', () => {
    if (connectedAddr) onWalletConnected(connectedAddr, connectedWallet || 'Wallet');
  });
}

// Restore connection on page load
async function restoreWallet() {
  const saved = localStorage.getItem('sv_wallet_addr');
  const name = localStorage.getItem('sv_wallet_name');
  if (!saved || !window.ethereum) return;
  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0 && accounts.find(a => a.toLowerCase() === saved.toLowerCase())) {
      activeProvider = window.ethereum;
      await onWalletConnected(accounts[0], name || 'Wallet');
    } else {
      localStorage.removeItem('sv_wallet_addr');
      localStorage.removeItem('sv_wallet_name');
    }
  } catch { /* silent */ }
}
restoreWallet();

// ==================== CAMPAIGN MODAL ====================
function submitCampaign() {
  document.getElementById('campProjectForm').style.display = 'none';
  document.getElementById('campDone').style.display = 'block';
}

// ==================== i18n ====================
let currentLang = 'ko';

const i18n = {
  ko: {
    nav_quests: '퀘스트', nav_campaigns: '캠페인', nav_projects: '프로젝트용', nav_wallet: '지갑 연결',
    hero_h1: '암호화폐의 모든 기회,<br>한 곳에서.', hero_desc: '퀘스트에 참여하고, 보상을 받으세요.', hero_btn: '퀘스트 둘러보기',
    hm_campaigns: '활성 캠페인', hm_participants: '총 참여자', hm_rewards: '누적 보상 지급',
    quest_title: '지금 참여할 수 있는 퀘스트', quest_active: '참여 가능한 퀘스트',
    qt_project: '프로젝트', qt_quest: '퀘스트', qt_reward: '보상', qt_participants: '참여자', qt_status: '상태',
    qt_live: '진행중', qt_recruiting: '모집중',
    qq1_quest: '첫 스왑 체험', qq2_quest: '사용 리뷰 작성', qq3_quest: '친구 3명 초대',
    qq4_quest: '테스트넷 참여 & 피드백', qq4_reward: 'TGE 참여보상',
    quest_btn: '전체 퀘스트 보기',
    how_title: '3단계로 시작하세요',
    step1_title: '탐색하기', step1_desc: '캠페인과 퀘스트를 둘러보세요. 관심 있는 프로젝트를 찾아보세요.',
    step2_title: '참여하기', step2_desc: '퀘스트를 선택하고 미션을 수행하세요. 트윗, 팔로우, 앱 설치 등.',
    step3_title: '보상받기', step3_desc: '조건 달성 시 보상이 자동 지급됩니다. 토큰, USDT, NFT, 참여보상 포인트 등.',
    camp_title: '진행 중인 캠페인', camp_active: '활성 캠페인',
    ct_project: '프로젝트', ct_participants: '참여자', ct_pool: '보상 풀', ct_progress: '진행률', ct_status: '상태',
    why_title: '왜 SHILL VAULT인가',
    why1_title: '클릭 몇 번이면 끝', why1_desc: '복잡한 절차 없이, 참여하고 보상받으세요. 어려운 작업은 없습니다.',
    why2_title: '투명한 보상', why2_desc: '안전결제 기반 자동 정산. 조건 달성하면 보상이 자동 지급됩니다.',
    why3_title: '모든 기여 추적', why3_desc: '소셜 활동부터 온체인 활동까지 자동 검증. 당신의 기여는 기록으로 남습니다.',
    fp_title: '더 많은 유저가 필요하신가요?', fp_desc: '쉽고 빠르게, 프로젝트를 알리세요.',
    fp_f1: '캠페인 생성 및 보상 설정', fp_f2: '직접 설정하거나, 추천 세팅으로 바로 시작', fp_f3: '실시간 성과 대시보드',
    fp_cta: '캠페인 시작하기',
    cta_label: '누적 보상 지급액', cta_title: '당신의 보상이 쌓이고 있습니다.', cta_btn: '퀘스트 둘러보기',
    wm_title: '지갑 연결', wm_desc: '지갑을 연결하여 퀘스트에 참여하고 보상을 받으세요.',
    wm_mm_desc: '브라우저 확장 지갑', wm_rw_desc: 'EVM 멀티체인 지갑', wm_wc_desc: '모바일 지갑으로 QR 스캔',
    wm_popular: '인기', wm_soon: '준비중', wm_connected: '연결됨:',
    wm_connected_title: '지갑 연결됨', wm_wallet_label: '지갑', wm_chain_label: '체인', wm_address_label: '주소',
    wm_disconnect: '연결 해제', wm_rejected: '사용자가 연결을 거부했습니다.', wm_error: '연결에 실패했습니다. 다시 시도해주세요.',
    wm_no_wallet: 'Web3 지갑이 감지되지 않습니다.', wm_wc_soon: 'WalletConnect는 준비 중입니다. MetaMask 또는 Rabby를 이용해주세요.',
    wm_no_mm: 'MetaMask가 설치되어 있지 않습니다. MetaMask 확장을 설치해주세요.',
    camp_modal_title: '캠페인 시작하기', camp_form_desc: '프로젝트와 캠페인 목표를 알려주세요.',
    camp_proj_name: '프로젝트 이름', camp_sector: '섹터 / 카테고리', camp_chain: '체인',
    camp_budget: '예산 (USD)', camp_kpi: '성과 KPI',
    camp_kpi_views: '조회수 / 노출', camp_kpi_eng: '인게이지먼트 (좋아요, 리트윗, 댓글)',
    camp_kpi_clicks: '링크 클릭 / 레퍼럴', camp_kpi_onchain: '온체인 전환 (스왑, 민트)',
    camp_submit: '캠페인 생성 →',
    camp_done_title: '캠페인 생성 완료!', camp_done_desc: '캠페인이 설정되었습니다. 대시보드에서 관리하세요.', camp_done_btn: '확인'
  },
  en: {
    nav_quests: 'Quests', nav_campaigns: 'Campaigns', nav_projects: 'For Projects', nav_wallet: 'Connect Wallet',
    hero_h1: 'Every crypto opportunity,<br>in one place.', hero_desc: 'Join quests and earn rewards.', hero_btn: 'Browse Quests',
    hm_campaigns: 'Active Campaigns', hm_participants: 'Total Participants', hm_rewards: 'Total Rewards Paid',
    quest_title: 'Quests You Can Join Now', quest_active: 'Available Quests',
    qt_project: 'Project', qt_quest: 'Quest', qt_reward: 'Reward', qt_participants: 'Participants', qt_status: 'Status',
    qt_live: 'Active', qt_recruiting: 'Recruiting',
    qq1_quest: 'First swap experience', qq2_quest: 'Write usage review', qq3_quest: 'Invite 3 friends',
    qq4_quest: 'Join testnet & give feedback', qq4_reward: 'TGE Airdrop',
    quest_btn: 'View All Quests',
    how_title: 'Get started in 3 steps',
    step1_title: 'Explore', step1_desc: 'Browse campaigns and quests. Find projects that interest you.',
    step2_title: 'Participate', step2_desc: 'Pick a quest and complete the mission. Tweet, follow, install apps, and more.',
    step3_title: 'Earn Rewards', step3_desc: 'Rewards are paid automatically when conditions are met. Tokens, USDT, NFTs, and more.',
    camp_title: 'Active Campaigns', camp_active: 'Active Campaigns',
    ct_project: 'Project', ct_participants: 'Participants', ct_pool: 'Reward Pool', ct_progress: 'Progress', ct_status: 'Status',
    why_title: 'Why SHILL VAULT',
    why1_title: 'Just a few clicks', why1_desc: 'No complicated process. Just participate and earn. No difficult tasks.',
    why2_title: 'Transparent Rewards', why2_desc: 'Escrow-based auto-settlement. Rewards are paid automatically when conditions are met.',
    why3_title: 'Every Contribution Tracked', why3_desc: 'From social activity to on-chain activity, everything is auto-verified. Your contributions are recorded.',
    fp_title: 'Need more users?', fp_desc: 'Promote your project, quickly and easily.',
    fp_f1: 'Create campaigns & set rewards', fp_f2: 'Configure manually or start instantly with recommended settings', fp_f3: 'Real-time performance dashboard',
    fp_cta: 'Start a Campaign',
    cta_label: 'Total Rewards Paid', cta_title: 'Your rewards are stacking up.', cta_btn: 'Browse Quests',
    wm_title: 'Connect Wallet', wm_desc: 'Connect your wallet to join quests and earn rewards.',
    wm_mm_desc: 'Browser extension wallet', wm_rw_desc: 'EVM multi-chain wallet', wm_wc_desc: 'Scan QR with mobile wallet',
    wm_popular: 'Popular', wm_soon: 'Soon', wm_connected: 'Connected:',
    wm_connected_title: 'Wallet Connected', wm_wallet_label: 'Wallet', wm_chain_label: 'Chain', wm_address_label: 'Address',
    wm_disconnect: 'Disconnect', wm_rejected: 'Connection was rejected by user.', wm_error: 'Connection failed. Please try again.',
    wm_no_wallet: 'No Web3 wallet detected.', wm_wc_soon: 'WalletConnect is coming soon. Please use MetaMask or Rabby.',
    wm_no_mm: 'MetaMask is not installed. Please install MetaMask extension.',
    camp_modal_title: 'Start a Campaign', camp_form_desc: 'Tell us about your project and campaign goals.',
    camp_proj_name: 'Project Name', camp_sector: 'Sector / Category', camp_chain: 'Chain',
    camp_budget: 'Budget (USD)', camp_kpi: 'Performance KPIs',
    camp_kpi_views: 'Views / Impressions', camp_kpi_eng: 'Engagement (likes, retweets, replies)',
    camp_kpi_clicks: 'Link clicks / Referrals', camp_kpi_onchain: 'On-chain conversions (swaps, mints)',
    camp_submit: 'Create Campaign →',
    camp_done_title: 'Campaign Created!', camp_done_desc: 'Your campaign is set up. Manage it from the dashboard.', camp_done_btn: 'OK'
  }
};

function setLang(lang) {
  currentLang = lang;
  const L = i18n[lang];
  document.getElementById('langLabel').textContent = lang === 'ko' ? 'KR' : 'EN';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (L[key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
      if (L[key].includes('<')) el.innerHTML = L[key];
      else el.textContent = L[key];
    }
  });

  // Update lang dropdown active state
  document.querySelectorAll('.lang-opt').forEach(o => o.classList.remove('active'));
  document.querySelector('.lang-opt[onclick*="' + lang + '"]')?.classList.add('active');
  document.querySelector('.lang-drop')?.classList.remove('open');

  // Update wallet button if not connected
  if (!connectedAddr) {
    document.getElementById('walletBtn').textContent = L.nav_wallet;
  }
}

// ==================== CTA COUNT-UP ANIMATION ====================
function animateCounter(el, target, duration) {
  const start = performance.now();
  const update = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
    const val = Math.round(target * ease);
    el.textContent = '$' + val.toLocaleString();
    if (t < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

const ctaObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const counter = document.getElementById('ctaCounter');
    const label = e.target.querySelector('.cta-label');
    const title = e.target.querySelector('.cta-fade');
    const btnWrap = e.target.querySelector('.cta-anim');
    counter.classList.add('vis');
    if (label) label.classList.add('vis');
    if (title) title.classList.add('vis');
    if (btnWrap) { btnWrap.style.opacity = '1'; btnWrap.style.transform = 'translateY(0)'; }
    animateCounter(counter, 150000, 2000);
    ctaObs.unobserve(e.target);
  });
}, { threshold: 0.3 });
const ctaEl = document.getElementById('cta');
if (ctaEl) ctaObs.observe(ctaEl);

// Init
setLang('ko');
