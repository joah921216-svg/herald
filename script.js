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

async function connectMetaMask() {
  if (typeof window.ethereum === 'undefined') {
    alert(i18n[currentLang].wm_no_mm || 'MetaMask is not installed. Please install MetaMask extension.');
    window.open('https://metamask.io/download/', '_blank');
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accounts[0]) onWalletConnected(accounts[0], 'MetaMask');
  } catch (err) {
    console.error('MetaMask connection failed:', err);
  }
}

async function connectRabby() {
  // Rabby injects as window.rabby or as an ethereum provider
  const provider = window.rabby || window.ethereum?.providers?.find(p => p.isRabby) || window.ethereum;
  if (provider && (window.rabby || provider.isRabby)) {
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts[0]) onWalletConnected(accounts[0], 'Rabby');
    } catch(err) { console.error('Rabby connection failed:', err); }
  } else if (typeof window.ethereum !== 'undefined') {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts[0]) onWalletConnected(accounts[0], 'Rabby');
    } catch(err) { console.error(err); }
  } else {
    window.open('https://rabby.io/', '_blank');
  }
}

async function connectWalletConnect() {
  // WalletConnect v2 - open walletconnect modal
  if (typeof window.WalletConnectModal !== 'undefined') {
    // If WalletConnect SDK loaded
    alert('WalletConnect SDK loading...');
  } else {
    // Redirect to WalletConnect info
    window.open('https://walletconnect.com/', '_blank');
  }
}

function onWalletConnected(addr, walletName) {
  connectedAddr = addr;
  const short = addr.slice(0,6) + '...' + addr.slice(-4);
  // Update wallet button in nav
  const btn = document.getElementById('walletBtn');
  btn.classList.add('connected');
  btn.innerHTML = '<span class="wallet-addr">' + short + '</span>';
  btn.onclick = () => openModal('walletModal');
  // Update modal status
  document.getElementById('walletStatus').style.display = 'block';
  document.getElementById('walletAddr').textContent = short;
  // Update registration
  updateRegWalletStatus();
}

// ==================== CONTRIBUTOR REGISTRATION ====================
function regConnectWallet() {
  closeModal('regModal');
  openModal('walletModal');
}

function updateRegWalletStatus() {
  if (!connectedAddr) return;
  const short = connectedAddr.slice(0,6) + '...' + connectedAddr.slice(-4);
  const check = document.getElementById('regWalletCheck');
  check.innerHTML = '<div class="reg-wallet-status"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' + (i18n[currentLang].wm_connected || 'Connected:') + ' <span class="addr">' + short + '</span></div>';
  document.getElementById('regWalletBtn').style.display = 'none';
  document.getElementById('regNextBtn1').style.display = 'block';
}

let verifiedMethod = null;

function selectVerify(method) {
  document.querySelectorAll('#regStep2 .wallet-opt').forEach(o => o.style.borderColor = 'var(--border)');
  if (method === 'worldcoin') {
    document.getElementById('vOpt1').style.borderColor = 'var(--lime)';
    document.getElementById('verifyCodeBox').style.display = 'none';
    verifiedMethod = 'Worldcoin';
    document.getElementById('verifyStatus').style.display = 'block';
    document.getElementById('verifyStatus').innerHTML = '<div class="reg-wallet-status"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Worldcoin World ID verified</div>';
  } else if (method === 'humanity') {
    document.getElementById('vOpt2').style.borderColor = 'var(--lime)';
    document.getElementById('verifyCodeBox').style.display = 'none';
    verifiedMethod = 'Humanity Protocol';
    document.getElementById('verifyStatus').style.display = 'block';
    document.getElementById('verifyStatus').innerHTML = '<div class="reg-wallet-status"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Humanity Protocol verified</div>';
  } else if (method === 'telegram' || method === 'twitter') {
    const el = method === 'telegram' ? document.getElementById('vOpt3') : document.getElementById('vOpt4');
    el.style.borderColor = 'var(--lime)';
    document.getElementById('verifyCodeBox').style.display = 'block';
    document.getElementById('verifyStatus').style.display = 'none';
    verifiedMethod = method;
  }
}

function verifyCodeSubmit() {
  const code = document.getElementById('verifyCode').value;
  if (code.length >= 4) {
    document.getElementById('verifyCodeBox').style.display = 'none';
    document.getElementById('verifyStatus').style.display = 'block';
    const label = verifiedMethod === 'telegram' ? 'Telegram' : 'Twitter/X';
    document.getElementById('verifyStatus').innerHTML = '<div class="reg-wallet-status"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' + label + ' verified</div>';
    verifiedMethod = label;
  }
}

function regGoStep(step) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById('regStep' + i);
    if (el) el.style.display = i === step ? 'block' : 'none';
  }
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById('rs' + i);
    if (dot) dot.className = 'reg-step-dot ' + (i < step ? 'done' : (i === step ? 'active' : ''));
  }
  if (step === 4) buildSummary();
}

function buildSummary() {
  const name = document.getElementById('regName').value || '-';
  const tg = document.getElementById('regTg').value || '-';
  const tw = document.getElementById('regTwitter').value || '-';
  const niche = document.getElementById('regNiche').value || '-';
  const fol = document.getElementById('regFollowers').value || '-';
  const rate = document.getElementById('regRate').value || '-';
  const appeal = document.getElementById('regAppeal').value || '';
  const short = connectedAddr ? connectedAddr.slice(0,6)+'...'+connectedAddr.slice(-4) : (i18n[currentLang].reg_skipped || 'Skipped');
  const vMethod = verifiedMethod || (i18n[currentLang].reg_skipped || 'Skipped');
  const L = i18n[currentLang];
  let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">' +
    '<div><span style="color:var(--text-3);font-size:0.72rem;">' + (L.reg_name||'Display Name') + '</span><br><strong>' + name + '</strong></div>' +
    '<div><span style="color:var(--text-3);font-size:0.72rem;">Wallet</span><br><strong style="font-family:JetBrains Mono,monospace;font-size:0.82rem;">' + short + '</strong></div>' +
    '<div><span style="color:var(--text-3);font-size:0.72rem;">Telegram</span><br><strong>' + tg + '</strong></div>' +
    '<div><span style="color:var(--text-3);font-size:0.72rem;">Twitter</span><br><strong>' + tw + '</strong></div>' +
    '<div><span style="color:var(--text-3);font-size:0.72rem;">' + (L.reg_niche||'Niche') + '</span><br><strong>' + niche + '</strong></div>' +
    '<div><span style="color:var(--text-3);font-size:0.72rem;">' + (L.reg_followers||'Followers') + '</span><br><strong>' + Number(fol||0).toLocaleString() + '</strong></div>' +
    '<div><span style="color:var(--text-3);font-size:0.72rem;">' + (L.reg_rate||'Base Rate') + '</span><br><strong style="color:var(--lime);">$' + Number(rate||0).toLocaleString() + '/post</strong></div>' +
    '<div><span style="color:var(--text-3);font-size:0.72rem;">' + (L.v_status||'Verification') + '</span><br><strong style="color:var(--cyan);">' + vMethod + '</strong></div>' +
    '</div>';
  if (appeal) html += '<div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border);"><span style="color:var(--text-3);font-size:0.72rem;">' + (L.reg_appeal||'Appeal Points') + '</span><br><span style="color:var(--text-2);font-size:0.85rem;">' + appeal + '</span></div>';
  document.getElementById('regSummary').innerHTML = html;
}

function submitRegistration() {
  if (!document.getElementById('regAgree').checked) {
    alert(i18n[currentLang].reg_agree_alert || 'Please agree to the Terms of Service.');
    return;
  }
  document.getElementById('regStep4').style.display = 'none';
  document.getElementById('regDone').style.display = 'block';
  document.querySelectorAll('.reg-step-dot').forEach(d => d.className = 'reg-step-dot done');
}

// ==================== CAMPAIGN MODAL ====================
function campSelectRole(role) {
  document.getElementById('campRoleSelect').style.display = 'none';
  if (role === 'project') document.getElementById('campProjectForm').style.display = 'block';
  else document.getElementById('campUserForm').style.display = 'block';
}

function submitCampaign() {
  document.getElementById('campProjectForm').style.display = 'none';
  document.getElementById('campDone').style.display = 'block';
}

// ==================== i18n ====================
let currentLang = 'ko';

const i18n = {
  en: {
    nav_roster: 'Contributors', nav_rooms: 'Campaigns', nav_wallet: 'Connect Wallet',
    hero_tag: 'Web3 Contributor Platform',
    hero_h1: 'Participate, and rewards follow.',
    hero_desc: 'One tweet, one review, one testnet. Every Web3 activity you do earns rewards.',
    hero_btn1: 'Get Started', hero_btn2: 'View Quests',
    prob_eye: '// why shill vault', prob_title: 'Is Web3 participation still too hard?',
    prob_desc: 'SHILL VAULT solves it.',
    prob_role1: 'Scattered Info', prob_role2: 'Uncertain Rewards', prob_role3: 'High Barriers',
    prob_lbl_problem: 'Problem',
    prob_before1: 'Airdrop, quest, and event info scattered everywhere — hard to know what to do',
    prob_after1: 'See all project opportunities at a glance on one Quest Board',
    prob_before2: 'You participate but don\'t know if rewards will come — criteria are opaque',
    prob_after2: 'Escrow-based rewards. Auto-payout on condition met. Transparent structure',
    prob_before3: 'You need a big channel to earn in Web3',
    prob_after3: 'Anyone can earn through quests, reviews, and referrals regardless of channel size',
    feat_eye: '// how to participate', feat_title: 'How to Participate',
    feat_desc: 'Contribute to Web3 projects in various ways and earn rewards.',
    feat1_title: 'Complete Quests', feat1_desc: 'Complete tasks posted by projects and earn rewards. Testnets, swaps, signups, and more.',
    feat2_title: 'Write Reviews', feat2_desc: 'Use projects and write honest reviews. Projects pay per review.',
    feat3_title: 'Create Content', feat3_desc: 'Create tweets, threads, videos to promote projects. Get paid directly by projects.',
    feat4_title: 'Community Contribution', feat4_desc: 'Refer friends, run communities, introduce projects. Network contributions are rewarded too.',
    feat_cta: 'Register as Contributor',
    roster_eye: '// contributor directory', roster_title: 'Active Contributors',
    roster_desc: 'Browse verified contributors or reach them directly via Telegram & Twitter DM.',
    roster_register: 'Register as Contributor',
    rooms_eye: '// campaign status', rooms_title: 'Campaign Status',
    rooms_desc: 'Real-time campaign status. Escrowed funds, verified KPIs, transparent payouts.',
    rooms_active: 'Active Campaigns',
    camp_th_project: 'Project', camp_th_contributors: 'Contributors', camp_th_pool: 'Pool Size',
    camp_th_distributed: 'Distributed', camp_th_progress: 'Progress', camp_th_status: 'Status',
    trust_eye: '// trust layer', trust_title: 'Transparent by Design',
    trust_desc: 'No more rug-pulled campaigns or ghost contributors. Every interaction is verifiable.',
    tr1_title: 'Smart Contract Escrow', tr1_desc: 'Campaign funds locked in escrow. Released only when KPIs are cryptographically verified.',
    tr2_title: 'Instant Proof Log', tr2_desc: 'Every campaign, payout, and review is logged instantly with cryptographic hashes. Tamper-proof.',
    tr3_title: 'Two-Way Reviews', tr3_desc: 'Both contributors and projects rate each other post-campaign. Reputation builds over time.',
    cta_eye: '// get started', cta_title: 'Start now.',
    cta_desc: 'Just sign up and you can join quests right away.', cta_btn: 'Start for Free',
    fp_eye: '// for projects', fp_title: 'Want to grow your project?',
    fp_desc: 'Leverage a verified contributor network to spread your project. Escrow-based, performance-linked, transparent.',
    fp_f1: 'Contributor Network Access', fp_f2: 'Escrow Payments', fp_f3: 'Real-time Performance Tracking',
    fp_cta: 'Register Project',
    nav_quest: 'Quests',
    quest_eye: '// quest board', quest_title: 'Quest Board',
    quest_desc: 'Complete quests, write reviews, refer friends. Anyone can earn rewards.',
    quest_active: 'Available Quests', quest_btn: 'Join Quests',
    qt_project: 'Project', qt_quest: 'Quest', qt_type: 'Type', qt_reward: 'Reward', qt_participants: 'Participants', qt_status: 'Status',
    qt_exp: 'Experience', qt_review: 'Review', qt_referral: 'Referral', qt_airdrop: 'Airdrop',
    qt_live: 'Active', qt_recruiting: 'Recruiting',
    qq1_quest: 'First swap experience', qq2_quest: 'Write usage review',
    qq3_quest: 'Invite 3 friends', qq4_quest: 'Join testnet & give feedback', qq4_reward: 'TGE Airdrop',
    kc_tg: 'TG Subscribers', kc_tw: 'X Followers',
    wm_title: 'Connect Wallet', wm_desc: 'Connect your wallet to register as a contributor, receive rewards, and manage your on-chain reputation.',
    wm_mm_desc: 'Browser extension wallet', wm_rw_desc: 'EVM multi-chain wallet', wm_wc_desc: 'Scan QR with mobile wallet',
    wm_popular: 'Popular', wm_connected: 'Connected:', wm_register: 'Register as Contributor →',
    wm_no_mm: 'MetaMask is not installed. Please install MetaMask extension.',
    wm_no_rw: 'No Web3 wallet detected. Please install a compatible wallet.',
    reg_title: 'Contributor Registration', reg_s1_desc: 'Connect your wallet to create your on-chain contributor identity. You can skip and connect later.',
    reg_s1_btn: 'Connect Wallet', reg_next: 'Next →',
    reg_skip: 'Skip for now →', reg_skipped: 'Skipped', reg_appeal: 'Appeal Points', reg_optional: '(Optional)',
    reg_s2_desc: 'Verify your identity to earn a trust badge. Choose one method below.',
    v_wc_desc: 'Orb-verified proof of personhood', v_hp_desc: 'Palm-scan identity verification',
    v_tg_name: 'Telegram Verification', v_tg_desc: 'Send code to your Telegram',
    v_tw_name: 'Twitter / X Verification', v_tw_desc: 'Verify via tweet or DM code',
    v_code_label: 'Verification Code', v_verify: 'Verify', v_status: 'Verification',
    reg_s3_desc: 'Set up your contributor profile. This will be visible to projects.',
    reg_name: 'Display Name', reg_tg: 'Telegram Handle', reg_twitter: 'Twitter / X Handle',
    reg_niche: 'Niche / Sector', reg_followers: 'Follower Count', reg_rate: 'Base Rate (USD / Post)',
    reg_s4_desc: 'Review your information and submit your contributor registration.',
    reg_agree: 'I agree to the SHILL VAULT Terms of Service and Privacy Policy',
    reg_agree_alert: 'Please agree to the Terms of Service.',
    reg_submit: 'Submit Registration',
    reg_done_title: 'Registration Complete!',
    reg_done_desc: 'Your contributor profile is now live. Projects can find you and invite you to campaigns.',
    reg_done_btn: 'Go to Dashboard',
    camp_title: 'Get Started', camp_desc: 'Are you a Project looking to promote, or a Contributor looking to earn?',
    camp_project: "I'm a Project", camp_proj_desc: 'Launch campaigns and recruit contributors',
    camp_user: "I'm a Contributor", camp_user_desc: 'Connect accounts and start earning',
    camp_proj_form_desc: 'Tell us about your project and campaign goals.',
    camp_proj_name: 'Project Name', camp_sector: 'Sector / Category', camp_chain: 'Chain',
    camp_posts: 'Desired Posts (min)', camp_budget: 'Budget (USD)', camp_kpi: 'Performance KPIs',
    camp_kpi_views: 'Views / Impressions', camp_kpi_eng: 'Engagement (likes, retweets, replies)',
    camp_kpi_clicks: 'Link clicks / Referrals', camp_kpi_onchain: 'On-chain conversions (swaps, mints)',
    camp_kpi_target: 'Target Numbers (optional)', camp_submit: 'Create Campaign →',
    camp_user_form_desc: 'Connect your accounts to start browsing campaigns and earning rewards.',
    camp_connect_wallet: 'Connect Wallet', camp_connect_desc: 'MetaMask, Rabby Wallet, WalletConnect',
    camp_register_kol: 'Register as Contributor', camp_register_desc: 'Full profile with verification',
    camp_done_title: 'Campaign Created!', camp_done_desc: 'Your Token Room is being set up. Browse contributors and invite them.',
    camp_done_btn: 'Browse Contributors'
  },
  ko: {
    nav_roster: '기여자', nav_rooms: '캠페인 현황', nav_wallet: '지갑 연결',
    hero_tag: 'Web3 기여자 플랫폼',
    hero_h1: '활동하면, 보상이 따라옵니다.',
    hero_desc: '트윗 하나, 리뷰 하나, 테스트넷 참여 하나. 당신의 모든 Web3 활동에 보상이 붙습니다.',
    hero_btn1: '시작하기', hero_btn2: '퀘스트 보기',
    prob_eye: '// why shill vault', prob_title: 'Web3 참여, 아직도 어렵기만 한가요?',
    prob_desc: 'SHILL VAULT가 해결합니다.',
    prob_role1: '흩어진 정보', prob_role2: '불확실한 보상', prob_role3: '진입 장벽',
    prob_lbl_problem: 'Problem',
    prob_before1: '에어드랍, 퀘스트, 이벤트 정보가 여기저기 흩어져 있어 어디서 뭘 해야 할지 모르겠다',
    prob_after1: '퀘스트 보드 하나에서 모든 프로젝트의 참여 기회를 한눈에 확인',
    prob_before2: '참여했는데 보상이 올지 안 올지 모르겠고, 기준도 불투명하다',
    prob_after2: '에스크로 기반 보상. 조건 달성하면 자동 지급. 투명한 구조',
    prob_before3: '대형 채널이 없으면 Web3에서 수익을 내기 어렵다',
    prob_after3: '채널 규모 상관없이 누구나 퀘스트, 리뷰, 추천으로 보상을 받을 수 있다',
    feat_eye: '// 참여 방법', feat_title: '이렇게 참여하세요',
    feat_desc: '다양한 방법으로 Web3 프로젝트에 기여하고 보상을 받으세요.',
    feat1_title: '퀘스트 참여', feat1_desc: '프로젝트가 등록한 퀘스트를 수행하고 보상을 받으세요. 테스트넷, 스왑 체험, 가입 등 다양한 미션.',
    feat2_title: '리뷰 작성', feat2_desc: '프로젝트를 직접 사용하고 솔직한 리뷰를 작성하세요. 프로젝트가 리뷰당 보상을 지급합니다.',
    feat3_title: '콘텐츠 제작', feat3_desc: '트윗, 쓰레드, 영상을 만들어 프로젝트를 알리세요. 프로젝트로부터 직접 보상을 받습니다.',
    feat4_title: '커뮤니티 기여', feat4_desc: '친구 추천, 커뮤니티 운영, 프로젝트 소개. 네트워크를 활용한 기여도 보상 대상입니다.',
    feat_cta: '참여자 등록',
    roster_eye: '// 기여자 디렉토리', roster_title: '활동 중인 기여자',
    roster_desc: '검증된 기여자를 탐색하거나 텔레그램 & 트위터 DM으로 직접 연락하세요.',
    roster_register: '기여자로 등록하기',
    rooms_eye: '// 캠페인 현황', rooms_title: '캠페인 현황',
    rooms_desc: '실시간 캠페인 현황. 에스크로 자금, 검증된 KPI, 투명한 정산.',
    rooms_active: '진행 중인 캠페인',
    camp_th_project: '프로젝트', camp_th_contributors: '기여자', camp_th_pool: '풀 규모',
    camp_th_distributed: '지급액', camp_th_progress: '진행률', camp_th_status: '상태',
    trust_eye: '// 신뢰 레이어', trust_title: '투명한 설계',
    trust_desc: '러그풀 캠페인이나 유령 기여자는 더 이상 없습니다. 모든 상호작용이 검증 가능합니다.',
    tr1_title: '스마트 컨트랙트 에스크로', tr1_desc: '캠페인 자금이 에스크로에 잠깁니다. KPI가 검증된 경우에만 지급됩니다.',
    tr2_title: '실시간 증명 로그', tr2_desc: '모든 캠페인, 정산, 리뷰가 암호학적 해시로 즉시 기록됩니다. 위변조 불가.',
    tr3_title: '양방향 리뷰', tr3_desc: '기여자와 프로젝트 모두 캠페인 종료 후 상호 평가합니다. 시간이 지날수록 평판이 쌓입니다.',
    cta_eye: '// 시작하기', cta_title: '지금 시작하세요.',
    cta_desc: '가입만 하면 바로 퀘스트에 참여할 수 있습니다.', cta_btn: '무료로 시작하기',
    fp_eye: '// for projects', fp_title: '프로젝트를 성장시키고 싶으신가요?',
    fp_desc: '검증된 기여자 네트워크를 활용해 프로젝트를 확산하세요. 에스크로 기반, 성과 연동, 투명한 구조.',
    fp_f1: '기여자 네트워크 접근', fp_f2: '에스크로 결제', fp_f3: '실시간 성과 추적',
    fp_cta: '프로젝트 등록하기',
    nav_quest: '퀘스트',
    quest_eye: '// 퀘스트 보드', quest_title: '퀘스트 보드',
    quest_desc: '퀘스트 수행, 리뷰 작성, 친구 추천. 누구나 보상을 받을 수 있습니다.',
    quest_active: '참여 가능한 퀘스트', quest_btn: '퀘스트 참여하기',
    qt_project: '프로젝트', qt_quest: '퀘스트', qt_type: '유형', qt_reward: '보상', qt_participants: '참여자', qt_status: '상태',
    qt_exp: '체험', qt_review: '리뷰', qt_referral: '레퍼럴', qt_airdrop: '에어드랍',
    qt_live: '진행중', qt_recruiting: '모집중',
    qq1_quest: '첫 스왑 체험', qq2_quest: '사용 리뷰 작성',
    qq3_quest: '친구 3명 초대', qq4_quest: '테스트넷 참여 & 피드백', qq4_reward: 'TGE 에어드랍',
    kc_tg: 'TG 구독자', kc_tw: 'X 팔로워',
    wm_title: '지갑 연결', wm_desc: '지갑을 연결하여 기여자로 등록하고, 보상을 받고, 온체인 평판을 관리하세요.',
    wm_mm_desc: '브라우저 확장 지갑', wm_rw_desc: 'EVM 멀티체인 지갑', wm_wc_desc: '모바일 지갑으로 QR 스캔',
    wm_popular: '인기', wm_connected: '연결됨:', wm_register: '기여자로 등록 →',
    wm_no_mm: 'MetaMask가 설치되어 있지 않습니다. MetaMask 확장을 설치해주세요.',
    wm_no_rw: 'Web3 지갑이 감지되지 않습니다. 호환 지갑을 설치해주세요.',
    reg_title: '기여자 등록', reg_s1_desc: '지갑을 연결하여 온체인 기여자 신원을 생성하세요. 나중에 연결할 수도 있습니다.',
    reg_s1_btn: '지갑 연결', reg_next: '다음 →',
    reg_skip: '나중에 하기 →', reg_skipped: '건너뜀',
    reg_s2_desc: '신원을 인증하여 신뢰 배지를 획득하세요.',
    v_wc_desc: 'Orb 인증 인격 증명', v_hp_desc: '손바닥 스캔 신원 인증',
    v_tg_name: '텔레그램 인증', v_tg_desc: '텔레그램으로 인증코드 발송',
    v_tw_name: '트위터 / X 인증', v_tw_desc: '트윗 또는 DM 코드로 인증',
    v_code_label: '인증 코드', v_verify: '인증하기', v_status: '인증 상태',
    reg_s3_desc: '기여자 프로필을 설정하세요. 프로젝트에게 공개됩니다.',
    reg_name: '표시 이름', reg_tg: '텔레그램 핸들', reg_twitter: '트위터 / X 핸들',
    reg_niche: '분야 / 섹터', reg_followers: '팔로워 수', reg_rate: '기본 단가 (USD / 포스트)',
    reg_appeal: '어필 포인트', reg_optional: '(선택사항)',
    reg_s4_desc: '정보를 확인하고 기여자 등록을 제출하세요.',
    reg_agree: 'SHILL VAULT 이용약관 및 개인정보처리방침에 동의합니다',
    reg_agree_alert: '이용약관에 동의해주세요.',
    reg_submit: '등록 제출',
    reg_done_title: '등록 완료!',
    reg_done_desc: '기여자 프로필이 라이브 되었습니다. 프로젝트에서 당신을 찾아 캠페인에 초대할 수 있습니다.',
    reg_done_btn: '대시보드로 이동',
    camp_title: '시작하기', camp_desc: '프로모션을 원하는 프로젝트인가요, 기여를 통해 수익을 원하는 참여자인가요?',
    camp_project: '프로젝트입니다', camp_proj_desc: '캠페인을 시작하고 기여자를 모집하세요',
    camp_user: '기여자입니다', camp_user_desc: '계정을 연결하고 수익을 시작하세요',
    camp_proj_form_desc: '프로젝트와 캠페인 목표를 알려주세요.',
    camp_proj_name: '프로젝트 이름', camp_sector: '섹터 / 카테고리', camp_chain: '체인',
    camp_posts: '희망 게시글 수 (최소)', camp_budget: '예산 (USD)', camp_kpi: '성과 KPI',
    camp_kpi_views: '조회수 / 노출', camp_kpi_eng: '인게이지먼트 (좋아요, 리트윗, 댓글)',
    camp_kpi_clicks: '링크 클릭 / 레퍼럴', camp_kpi_onchain: '온체인 전환 (스왑, 민트)',
    camp_kpi_target: '목표 수치 (선택사항)', camp_submit: '캠페인 생성 →',
    camp_user_form_desc: '계정을 연결하여 캠페인을 탐색하고 보상을 받으세요.',
    camp_connect_wallet: '지갑 연결', camp_connect_desc: 'MetaMask, Rabby 지갑, WalletConnect',
    camp_register_kol: '기여자로 등록', camp_register_desc: '인증이 포함된 전체 프로필',
    camp_done_title: '캠페인 생성 완료!', camp_done_desc: '토큰 룸이 설정되고 있습니다. 기여자를 탐색하고 초대하세요.',
    camp_done_btn: '기여자 탐색'
  },
  ja: {
    nav_roster: 'コントリビューター', nav_rooms: 'キャンペーン', nav_wallet: 'ウォレット接続',
    hero_tag: 'Web3コントリビュータープラットフォーム',
    hero_h1: '活動すれば、報酬がついてきます。',
    hero_desc: 'ツイート1つ、レビュー1つ、テストネット参加1つ。あなたのすべてのWeb3活動に報酬が付きます。',
    hero_btn1: '始める', hero_btn2: 'クエストを見る',
    prob_eye: '// why shill vault', prob_title: 'Web3への参加、まだ難しいですか？',
    prob_desc: 'SHILL VAULTが解決します。',
    prob_role1: '散在する情報', prob_role2: '不確実な報酬', prob_role3: '参入障壁',
    prob_lbl_problem: 'Problem',
    prob_before1: 'エアドロップ、クエスト、イベント情報があちこちに散在して何をすべきかわからない',
    prob_after1: '1つのクエストボードですべてのプロジェクト参加機会を一覧',
    prob_before2: '参加しても報酬が来るか不明で基準も不透明',
    prob_after2: 'エスクロー基盤の報酬。条件達成で自動支給。透明な構造',
    prob_before3: '大きなチャンネルがないとWeb3で稼ぐのは難しい',
    prob_after3: 'チャンネル規模に関係なく誰でもクエスト、レビュー、紹介で報酬を得られる',
    feat_eye: '// 参加方法', feat_title: 'こうやって参加しよう',
    feat_desc: 'さまざまな方法でWeb3プロジェクトに貢献し報酬を獲得。',
    feat1_title: 'クエスト参加', feat1_desc: 'プロジェクトが登録したクエストを完了して報酬を獲得。テストネット、スワップ体験、登録など。',
    feat2_title: 'レビュー執筆', feat2_desc: 'プロジェクトを実際に使用し正直なレビューを執筆。レビューごとに報酬が支払われます。',
    feat3_title: 'コンテンツ制作', feat3_desc: 'ツイート、スレッド、動画を作成してプロジェクトを紹介。プロジェクトから直接報酬を獲得。',
    feat4_title: 'コミュニティ貢献', feat4_desc: '友達紹介、コミュニティ運営、プロジェクト紹介。ネットワーク活用の貢献も報酬対象。',
    feat_cta: 'コントリビューター登録',
    roster_eye: '// コントリビューターディレクトリ', roster_title: '活動中のコントリビューター',
    roster_desc: '認証済みコントリビューターを閲覧、またはTelegram＆Twitter DMで直接連絡。',
    roster_register: 'コントリビューターとして登録',
    rooms_eye: '// キャンペーン状況', rooms_title: 'キャンペーン状況',
    rooms_desc: 'リアルタイムキャンペーン状況。エスクロー資金、検証済みKPI、透明な決済。',
    rooms_active: '進行中のキャンペーン',
    camp_th_project: 'プロジェクト', camp_th_contributors: 'コントリビューター', camp_th_pool: 'プールサイズ',
    camp_th_distributed: '配布済み', camp_th_progress: '進捗', camp_th_status: 'ステータス',
    trust_eye: '// 信頼レイヤー', trust_title: '透明な設計',
    trust_desc: 'ラグプルキャンペーンやゴーストコントリビューターはもうありません。すべてが検証可能。',
    tr1_title: 'スマートコントラクトエスクロー', tr1_desc: 'キャンペーン資金はエスクローにロック。KPIが検証された場合のみ支払い。',
    tr2_title: 'インスタント証明ログ', tr2_desc: 'すべてのキャンペーン、決済、レビューが暗号ハッシュで即座に記録。改ざん不可。',
    tr3_title: '双方向レビュー', tr3_desc: 'コントリビューターとプロジェクト双方がキャンペーン後に相互評価。評判は蓄積されます。',
    cta_eye: '// 始める', cta_title: '今すぐ始めましょう。',
    cta_desc: '登録するだけですぐにクエストに参加できます。', cta_btn: '無料で始める',
    fp_eye: '// for projects', fp_title: 'プロジェクトを成長させたいですか？',
    fp_desc: '検証済みコントリビューターネットワークでプロジェクトを拡散。エスクロー基盤、成果連動、透明な構造。',
    fp_f1: 'コントリビューターネットワーク', fp_f2: 'エスクロー決済', fp_f3: 'リアルタイム成果追跡',
    fp_cta: 'プロジェクト登録',
    nav_quest: 'クエスト',
    quest_eye: '// クエストボード', quest_title: 'クエストボード',
    quest_desc: 'クエスト完了、レビュー執筆、友達紹介。誰でも報酬を獲得できます。',
    quest_active: '参加可能なクエスト', quest_btn: 'クエストに参加',
    qt_project: 'プロジェクト', qt_quest: 'クエスト', qt_type: 'タイプ', qt_reward: '報酬', qt_participants: '参加者', qt_status: 'ステータス',
    qt_exp: '体験', qt_review: 'レビュー', qt_referral: 'リファラル', qt_airdrop: 'エアドロップ',
    qt_live: '進行中', qt_recruiting: '募集中',
    qq1_quest: '初回スワップ体験', qq2_quest: '利用レビュー執筆',
    qq3_quest: '友達3人招待', qq4_quest: 'テストネット参加＆フィードバック', qq4_reward: 'TGEエアドロップ',
    kc_tg: 'TGフォロワー', kc_tw: 'Xフォロワー',
    wm_title: 'ウォレット接続', wm_desc: 'ウォレットを接続してコントリビューター登録、報酬受取、オンチェーン評判管理。',
    wm_mm_desc: 'ブラウザ拡張ウォレット', wm_rw_desc: 'EVMマルチチェーンウォレット', wm_wc_desc: 'モバイルウォレットでQRスキャン',
    wm_popular: '人気', wm_connected: '接続済み:', wm_register: 'コントリビューター登録 →',
    wm_no_mm: 'MetaMaskがインストールされていません。', wm_no_rw: 'Web3ウォレットが検出されません。',
    reg_title: 'コントリビューター登録', reg_s1_desc: 'ウォレットを接続してオンチェーンIDを作成。後で接続も可能。',
    reg_s1_btn: 'ウォレット接続', reg_next: '次へ →',
    reg_skip: '後で →', reg_skipped: 'スキップ済み',
    reg_s2_desc: '本人確認で信頼バッジを獲得。',
    v_wc_desc: 'Orb認証による人格証明', v_hp_desc: '手のひらスキャン本人確認',
    v_tg_name: 'Telegram認証', v_tg_desc: 'Telegramに認証コードを送信',
    v_tw_name: 'Twitter / X認証', v_tw_desc: 'ツイートまたはDMコードで認証',
    v_code_label: '認証コード', v_verify: '認証する', v_status: '認証状態',
    reg_s3_desc: 'コントリビュータープロフィールを設定。プロジェクトに公開されます。',
    reg_name: '表示名', reg_tg: 'Telegramハンドル', reg_twitter: 'Twitter / Xハンドル',
    reg_niche: 'ニッチ/セクター', reg_followers: 'フォロワー数', reg_rate: '基本料金 (USD/投稿)',
    reg_appeal: 'アピールポイント', reg_optional: '（任意）',
    reg_s4_desc: '情報を確認してコントリビューター登録を提出。',
    reg_agree: 'SHILL VAULT利用規約及びプライバシーポリシーに同意します',
    reg_agree_alert: '利用規約に同意してください。', reg_submit: '登録提出',
    reg_done_title: '登録完了！', reg_done_desc: 'コントリビュータープロフィールが公開されました。',
    reg_done_btn: 'ダッシュボードへ',
    camp_title: '始めましょう', camp_desc: 'プロモーションしたいプロジェクトですか、貢献で稼ぎたいコントリビューターですか？',
    camp_project: 'プロジェクトです', camp_proj_desc: 'キャンペーンを開始してコントリビューターを募集',
    camp_user: 'コントリビューターです', camp_user_desc: 'アカウントを接続して報酬を獲得',
    camp_proj_form_desc: 'プロジェクトとキャンペーン目標を教えてください。',
    camp_proj_name: 'プロジェクト名', camp_sector: 'セクター / カテゴリー', camp_chain: 'チェーン',
    camp_posts: '希望投稿数（最小）', camp_budget: '予算（USD）', camp_kpi: 'パフォーマンスKPI',
    camp_kpi_views: 'ビュー / インプレッション', camp_kpi_eng: 'エンゲージメント（いいね、リツイート、リプライ）',
    camp_kpi_clicks: 'リンククリック / リファラル', camp_kpi_onchain: 'オンチェーン転換（スワップ、ミント）',
    camp_kpi_target: '目標数値（任意）', camp_submit: 'キャンペーン作成 →',
    camp_user_form_desc: 'アカウントを接続してキャンペーンを閲覧し報酬を獲得。',
    camp_connect_wallet: 'ウォレット接続', camp_connect_desc: 'MetaMask、Rabby Wallet、WalletConnect',
    camp_register_kol: 'コントリビューター登録', camp_register_desc: '認証付きフルプロフィール',
    camp_done_title: 'キャンペーン作成完了！', camp_done_desc: 'トークンルーム設定中。コントリビューターを閲覧して招待。',
    camp_done_btn: 'コントリビューターを閲覧'
  },
  zh: {
    nav_roster: 'KOL名单', nav_rooms: '活动状态',
    nav_binance: 'Binance KOL', nav_pricing: '价格', nav_wallet: '连接钱包',
    hero_tag: 'Web3开放市场',
    hero_h1: '贡献自由。奖励透明。<br><span class="lime">共同成长。</span>',
    hero_desc: '参与者直接设定奖励，项目更快成长的开放市场。没有中间差价，每一份贡献都有回报。',
    hero_btn1: '启动营销活动', hero_btn2: '注册KOL', hero_btn3: '参与任务',
    hm1: '认证KOL', hm2: '已分配奖励', hm3: '平均活动ROI',
    how_eye: '// 流程', how_title: '使用方法', how_desc: '从活动简报到链上验证结算，四个步骤。',
    hs1_t: 'KOL注册', hs1_d: '关联Twitter和Telegram。设置领域、费率、作品集。即时上线。',
    hs2_t: '向项目发送提案', hs2_d: '浏览项目并发送推广提案。或由项目方通过搜索和筛选找到你。',
    hs3_t: '代币房间开启', hs3_d: '项目方托管资金。KOL接受条款后开始推广。KPI实时追踪。',
    hs4_t: '自动结算', hs4_d: 'KPI验证完成。选择：接收项目代币或通过DEX即时兑换为稳定币。双方互评。',
    dual_eye: '// 市场', dual_title: '每一份贡献都有回报的Web3市场。',
    dual_desc: 'KOL设定单价，项目选择人才，用户通过任务参与。角色不同，奖励结构统一。',
    dk_label: 'KOL专区', dk_title: '我的价值。我来决定。',
    dk_desc: '无需中介，直接与项目协商。所有成果记录在链上，声誉成为你的资产。',
    dk_f1: 'Twitter和Telegram ID自动关联', dk_f2: '实时自由设定和更新费率',
    dk_f3: '自定义资料：专业领域、作品集、活动历史', dk_f4: '奖励仪表板（代币和稳定币）',
    dk_f5: '自动累积绩效评分和信任等级', dk_f6: '活动结束后评价和审查项目',
    dp_label: '项目专区', dp_title: '精准触达，验证结果',
    dp_desc: '为您的发布找到合适的KOL。数据驱动选择，托管支付，实时绩效追踪。',
    dp_f1: '创建代币房间并邀请KOL', dp_f2: '搜索/筛选：粉丝、领域、绩效、价格、语言',
    dp_f3: '通过TG/Twitter DM自动邀请未注册KOL', dp_f4: '智能合约托管：注资→验证→自动结算',
    dp_f5: '实时仪表板：曝光、互动、链上转化', dp_f6: 'KOL评价和ROI分析',
    roster_eye: '// KOL目录', roster_title: 'KOL名单',
    roster_desc: '浏览认证KOL或通过Telegram和Twitter DM直接联系未注册KOL。',
    rooms_eye: '// 活动状态', rooms_title: '活动状态',
    rooms_desc: '实时活动状态。托管资金，验证KPI，透明结算。',
    rooms_active: '进行中的活动',
    bnb_title: 'Binance KOL项目 <span style="color:#f3ba2f;">合格</span>',
    bnb_desc: '自动根据Binance附属计划要求筛选KOL名单。',
    bnb_req_title: 'Binance KOL要求', bnb_req_desc: '要获得Binance KOL/附属计划资格，需满足以下条件之一：',
    bnb_r1: '社交媒体粉丝5,000+', bnb_r2: '社群成员500+',
    bnb_r3: '活跃的加密内容创作历史', bnb_r4: '现货41~50%+期货30~40%佣金',
    bnb_r5: '季度绩效审核', bnb_apply: '申请Binance KOL项目 →',
    bnb_eligible_title: '合格KOL列表',
    trust_eye: '// 信任层', trust_title: '透明设计',
    trust_desc: '不再有跑路活动或幽灵KOL。每次互动都可验证。',
    road_eye: '// 路线图', road_title: '下一步', road_desc: '从市场到全栈KOL基础设施。',
    price_eye: '// 价格', price_title: '简单透明的费用', price_desc: '免费加入。仅在价值交付时付费。',
    cta_eye: '// 开始', cta_title: '无需中介，<span class="lime">直接连接。</span>',
    cta_desc: '项目方创建营销活动，KOL注册，任何人都可以参与任务。',
    quest_highlight: '不是KOL也没关系。人人可参与，人人可获得奖励。',
    prob_eye: '// why shill vault', prob_title: '当前Web3营销效率低下',
    prob_role1: '项目', prob_role2: 'KOL', prob_role3: '用户',
    prob_before1: '向中介支付30%+佣金，预算流入KOL内部圈子，实际效果不透明',
    prob_after1: '直接选择KOL，托管仅在成果达标时支付。无差价的透明结构',
    prob_before2: '内部圈子外难以接触工作，中间被压价，无法自定单价',
    prob_after2: '任何人都可以注册，自己设定单价，直接与项目连接',
    prob_before3: '空投信息分散，不知道该做什么，参与后奖励不确定',
    prob_after3: '在任务板一键参与。达标后自动发放奖励',
    wm_title: '连接钱包', wm_desc: '连接钱包以注册KOL、接收活动奖励并管理链上声誉。',
    wm_mm_desc: '浏览器扩展钱包', wm_rw_desc: 'Reddit Vault / Web3钱包', wm_wc_desc: '用手机钱包扫码',
    wm_popular: '热门', wm_connected: '已连接:', wm_register: '注册为KOL →',
    wm_no_mm: '未安装MetaMask。请安装MetaMask扩展。', wm_no_rw: '未检测到Web3钱包。',
    wm_wc_soon: 'WalletConnect集成即将上线。',
    reg_title: 'KOL注册', reg_s1_desc: '首先连接钱包以创建链上KOL身份。',
    reg_s1_btn: '连接钱包', reg_next: '下一步 →',
    reg_skip: '稍后再说 →', reg_skipped: '已跳过',
    reg_s2_desc: '验证您的身份。提高KOL信誉度，获得更多活动机会。',
    v_wc_desc: 'Orb认证人格证明', v_hp_desc: '掌纹扫描身份验证',
    v_tg_name: 'Telegram验证', v_tg_desc: '向Telegram发送验证码',
    v_tw_name: 'Twitter / X验证', v_tw_desc: '通过推文或DM代码验证',
    v_code_label: '验证码', v_verify: '验证', v_status: '验证状态',
    reg_s3_desc: '设置KOL个人资料。将对寻找推广者的项目方可见。',
    reg_name: '显示名称', reg_tg: 'Telegram用户名', reg_twitter: 'Twitter / X用户名',
    reg_niche: '领域/赛道', reg_followers: '粉丝数', reg_rate: '基础费率 (USD/帖)',
    reg_appeal: '自我推荐', reg_optional: '（可选）',
    reg_s4_desc: '确认信息并提交KOL注册。',
    reg_agree: '我同意SHILL VAULT服务条款和隐私政策',
    reg_agree_alert: '请同意服务条款。', reg_submit: '提交注册',
    reg_done_title: '注册完成！', reg_done_desc: 'KOL资料已上线。项目方可以在名单中找到您。',
    reg_done_btn: '前往仪表板',
    camp_title: '开始使用', camp_desc: '您是想推广的项目方，还是想赚取收益的用户（KOL）？',
    camp_project: '我是项目方', camp_proj_desc: '启动活动并雇佣KOL',
    camp_user: '我是KOL/用户', camp_user_desc: '连接账户并开始赚取收益',
    camp_proj_form_desc: '告诉我们您的项目和活动目标。',
    camp_proj_name: '项目名称', camp_sector: '赛道/类别', camp_chain: '链',
    camp_posts: '期望帖子数（最少）', camp_budget: '预算（USD）', camp_kpi: '绩效KPI',
    camp_kpi_views: '浏览量/曝光', camp_kpi_eng: '互动（点赞、转发、评论）',
    camp_kpi_clicks: '链接点击/推荐', camp_kpi_onchain: '链上转化（交换、铸造）',
    camp_kpi_target: '目标数值（可选）', camp_submit: '创建活动 →',
    camp_user_form_desc: '连接您的账户以浏览活动并获取奖励。',
    camp_connect_wallet: '连接钱包', camp_connect_desc: 'MetaMask、Rabby钱包、WalletConnect',
    camp_register_kol: '注册为KOL', camp_register_desc: '含身份验证的完整资料',
    camp_done_title: '活动创建成功！', camp_done_desc: '代币房间正在设置中。浏览并邀请KOL。',
    camp_done_btn: '浏览KOL',
    tr1_title: '智能合约托管', tr1_desc: '活动资金锁定在托管中。仅在KPI通过加密验证后才释放。不再有"等待支付"的状态。',
    tr2_title: '即时证明日志', tr2_desc: '所有活动、结算和评价都通过加密哈希即时记录。零等待时间。防篡改，毫秒级检索。',
    tr3_title: '双向评价', tr3_desc: 'KOL和项目方在活动结束后互相评价。信誉随时间积累。',
    rm1_label: 'Phase 1 — 当前', rm1_title: '市场',
    rm1_1: 'KOL注册和资料系统', rm1_2: '代币房间创建和托管',
    rm1_3: 'DM推广（Telegram和Twitter）', rm1_4: '绩效追踪仪表板', rm1_5: '双向评价系统',
    rm2_label: 'Phase 2 — 2026 Q3', rm2_title: '启动平台整合',
    rm2_1: 'KOL支持代币发行', rm2_2: '预发布营销套装',
    rm2_3: '质押和忠诚度等级', rm2_4: '跨链扩展', rm2_5: '第三方API集成',
    rm3_label: 'Phase 3 — 2027', rm3_title: '治理代币',
    rm3_1: '$SHILL代币发行', rm3_2: 'DAO治理平台决策',
    rm3_3: '代币持有者收益分配', rm3_4: 'KOL指数和信誉NFT', rm3_5: '去中心化争议解决',
    kc_tg: 'TG订阅者', kc_tw: 'X粉丝', roster_register: '注册为KOL',
    pc_starter_name: 'Starter', pc_starter_price: '免费', pc_starter_sub: 'KOL和小型项目',
    pc_s_f1: 'KOL资料和作品集', pc_s_f2: '最多3个活动', pc_s_f3: '基础分析',
    pc_s_f4: '匹配费3%', pc_s_f5: '优先展示', pc_s_f6: 'DM自动发送',
    pc_starter_btn: '开始使用',
    pc_pro_name: 'Pro', pc_pro_sub: '成长阶段项目',
    pc_p_f1: '无限活动', pc_p_f2: '高级分析和ROI报告', pc_p_f3: '向未注册KOL自动发送DM',
    pc_p_f4: '优先支持', pc_p_f5: '匹配费0%', pc_p_f6: '私募投资轮参与',
    pc_pro_btn: '开始Pro',
    nav_quest: '任务',
    du_label: '普通用户', du_title: '参与即获奖励',
    du_desc: '不需要大量粉丝。完成任务、撰写评价、推荐朋友，即可从真实项目中获得奖励。',
    du_f1: '完成任务：空投、注册、测试网', du_f2: '撰写项目评价（像外卖APP评价一样）',
    du_f3: '推荐朋友获得额外奖励', du_f4: '向项目介绍人脉和社区',
    du_f5: '通过参与历史建立信任分数', du_f6: '无需频道 — 任何人都可以参与',
    du_btn: '加入任务板',
    quest_eye: '// 任务板', quest_title: '任务板',
    quest_desc: '完成任务、撰写评价、推荐朋友。无需频道 — 任何人都可以获得奖励。',
    quest_active: '可参与的任务', quest_btn: '加入任务板',
    qt_project: '项目', qt_quest: '任务', qt_type: '类型', qt_reward: '奖励', qt_participants: '参与者', qt_status: '状态',
    qt_exp: '体验', qt_review: '评价', qt_referral: '推荐', qt_airdrop: '空投',
    qt_live: '进行中', qt_recruiting: '招募中',
    qq1_quest: '首次兑换体验', qq2_quest: '撰写使用评价',
    qq3_quest: '邀请3位朋友', qq4_quest: '参与测试网并提供反馈', qq4_reward: 'TGE空投',
    wm_rw_desc: 'EVM多链钱包'
  }
};

// Map selectors to i18n keys (for elements without data-i18n)
const selectorMap = [];

function setLang(lang) {
  currentLang = lang;
  const L = i18n[lang];
  const labels = { en: 'EN', ko: 'KR', ja: 'JP', zh: 'ZH' };
  document.getElementById('langLabel').textContent = labels[lang];

  // Update all data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (L[key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
      // Check if translation contains HTML
      if (L[key].includes('<')) el.innerHTML = L[key];
      else el.textContent = L[key];
    }
  });

  // Update selector-mapped elements
  selectorMap.forEach(m => {
    const el = document.querySelector(m.sel);
    if (el && L[m.key]) {
      if (m.html || L[m.key].includes('<')) {
        el.innerHTML = (m.prefix || '') + (m.after || '') + L[m.key];
      } else {
        el.textContent = L[m.key];
      }
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

  // Update reg wallet status if connected
  if (connectedAddr) updateRegWalletStatus();
}

// ==================== TELEGRAM LIVE COUNT ====================
async function fetchTgCounts() {
  const cards = document.querySelectorAll('[data-tg]');
  for (const card of cards) {
    const channel = card.getAttribute('data-tg');
    const countEl = card.querySelector('.tg-count');
    if (!countEl) continue;
    try {
      const resp = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://t.me/' + channel));
      const html = await resp.text();
      const match = html.match(/tgme_page_extra[^>]*>([^<]+)/);
      if (match) {
        const numStr = match[1].replace(/\s/g, '').replace(/members|subscribers|участник.*/gi, '').trim();
        const num = parseInt(numStr.replace(/\D/g, ''));
        if (num > 0) {
          countEl.textContent = num >= 1000 ? (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : num.toString();
        }
      }
    } catch(e) { /* keep fallback */ }
  }
}

// Init: set Korean as default and fetch TG counts
setLang('ko');
fetchTgCounts();
