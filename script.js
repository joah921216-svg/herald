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
    showWalletError('MetaMask가 설치되어 있지 않습니다. MetaMask 확장을 설치해주세요.');
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
    if (err.code === 4001) showWalletError('사용자가 연결을 거부했습니다.');
    else showWalletError('연결에 실패했습니다. 다시 시도해주세요.');
    console.error('MetaMask connection failed:', err);
  }
  setOptLoading('mmBtn', false);
}

async function connectRabby() {
  const provider = window.rabby || window.ethereum?.providers?.find(p => p.isRabby) || window.ethereum;
  if (!provider) {
    showWalletError('Web3 지갑이 감지되지 않습니다.');
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
    if (err.code === 4001) showWalletError('사용자가 연결을 거부했습니다.');
    else showWalletError('연결에 실패했습니다. 다시 시도해주세요.');
    console.error('Rabby connection failed:', err);
  }
  setOptLoading('rbBtn', false);
}

function connectWalletConnect() {
  showWalletError('WalletConnect는 준비 중입니다. MetaMask 또는 Rabby를 이용해주세요.');
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
  btn.textContent = '지갑 연결';
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

// ==================== CAMPAIGN WIZARD (3-step) ====================
let wizStep = 1;
const WIZ_TOTAL = 3;

const GOAL_QUEST_MAP = {
  community: ['q_tg', 'q_discord'],
  awareness: ['q_follow', 'q_rt'],
  dapp: ['q_swap', 'q_mint'],
  onchain: ['q_swap', 'q_mint', 'q_stake'],
  content: ['q_review', 'q_youtube', 'q_thread'],
};

function toggleGoal(el) {
  el.classList.toggle('selected');
}

function selectPType(el) {
  document.querySelectorAll('.wiz-ptype').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  const ptype = el.dataset.ptype;
  document.getElementById('followerField').style.display = (ptype === 'influencer' || ptype === 'mix') ? 'block' : 'none';
  document.getElementById('contentQuestGroup').style.display = (ptype === 'influencer' || ptype === 'mix') ? 'block' : 'none';
}

function applyQuestRecommendations() {
  const selectedGoals = [];
  document.querySelectorAll('#wizStep1 .wiz-goal.selected').forEach(el => selectedGoals.push(el.dataset.goal));
  const recommended = new Set();
  selectedGoals.forEach(g => (GOAL_QUEST_MAP[g] || []).forEach(qid => recommended.add(qid)));
  document.querySelectorAll('.wiz-quest-cb').forEach(cb => { cb.checked = recommended.has(cb.dataset.qid); });
}

function buildStep3() {
  // Build dynamic quest reward inputs
  const container = document.getElementById('questRewardInputs');
  const quests = [];
  document.querySelectorAll('.wiz-quest-cb:checked').forEach(cb => {
    const name = cb.closest('.wiz-quest-item')?.querySelector('.wq-name')?.textContent;
    if (name) quests.push({ id: cb.dataset.qid, name: name });
  });
  let html = '';
  quests.forEach(q => {
    html += '<div class="wiz-qr-row"><span class="wiz-qr-name">' + q.name + '</span>' +
      '<div class="wiz-qr-input"><span>$</span><input type="number" placeholder="0" data-qid="' + q.id + '" oninput="updateEstimate()"></div></div>';
  });
  if (!html) html = '<p style="color:var(--text-3);font-size:0.82rem;">선택된 퀘스트가 없습니다.</p>';
  container.innerHTML = html;

  // Show/hide influencer tier table
  const ptype = document.querySelector('.wiz-ptype.selected')?.dataset.ptype;
  document.getElementById('tierTableField').style.display = (ptype === 'influencer' || ptype === 'mix') ? 'block' : 'none';

  // Build summary
  buildSummary();
  updateEstimate();
}

function buildSummary() {
  const name = document.getElementById('cwProjName').value || '-';
  const startD = document.getElementById('cwStart').value || '-';
  const endD = document.getElementById('cwEnd').value || '-';
  const goals = [];
  document.querySelectorAll('#wizStep1 .wiz-goal.selected .wiz-goal-name').forEach(el => goals.push(el.textContent));
  const ptype = document.querySelector('.wiz-ptype.selected .wiz-ptype-name')?.textContent || '-';
  const questNames = [];
  document.querySelectorAll('.wiz-quest-cb:checked').forEach(cb => {
    const n = cb.closest('.wiz-quest-item')?.querySelector('.wq-name')?.textContent;
    if (n) questNames.push(n);
  });
  const token = document.getElementById('cwToken').selectedOptions[0]?.text || '-';
  const budget = document.getElementById('cwBudget').value;

  const r = (l, v) => '<div class="wr-row" onclick="toggleConfirm(this)"><input type="checkbox" class="wr-check"><span class="wr-label">' + l + '</span><span class="wr-value">' + v + '</span></div>';
  document.getElementById('wizReview').innerHTML =
    r('프로젝트', name) +
    r('기간', startD + ' ~ ' + endD) +
    r('목표', goals.join(', ') || '-') +
    r('참여자', ptype) +
    r('퀘스트', questNames.map(n => '<span class="wr-quest-tag">' + n + '</span>').join(' ')) +
    r('보상 토큰', token) +
    r('총 예산', '$' + Number(budget || 0).toLocaleString());
  updateLaunchBtn();
}

function toggleConfirm(row) {
  const cb = row.querySelector('.wr-check');
  cb.checked = !cb.checked;
  row.classList.toggle('confirmed', cb.checked);
  updateLaunchBtn();
}

function updateLaunchBtn() {
  const allChecks = document.querySelectorAll('#wizReview .wr-check');
  const allDone = allChecks.length > 0 && [...allChecks].every(c => c.checked);
  const btn = document.getElementById('wizNext');
  if (wizStep === WIZ_TOTAL) {
    btn.classList.toggle('disabled', !allDone);
  }
}

function updateEstimate() {
  const budget = Number(document.getElementById('cwBudget').value) || 0;
  let totalPerPerson = 0;
  document.querySelectorAll('.wiz-qr-input input').forEach(inp => { totalPerPerson += Number(inp.value) || 0; });

  // Update tier table prices
  if (totalPerPerson > 0) {
    const base = totalPerPerson;
    document.getElementById('tierPrice1').textContent = '$' + base.toLocaleString();
    document.getElementById('tierPrice2').textContent = '$' + Math.round(base * 1.5).toLocaleString();
    document.getElementById('tierPrice3').textContent = '$' + Math.round(base * 2.5).toLocaleString();
  } else {
    document.getElementById('tierPrice1').textContent = '-';
    document.getElementById('tierPrice2').textContent = '-';
    document.getElementById('tierPrice3').textContent = '-';
  }

  // Estimated participants
  let est = '~350명';
  if (budget > 0 && totalPerPerson > 0) {
    est = '~' + Math.floor(budget / totalPerPerson).toLocaleString() + '명';
  }
  document.getElementById('estParticipants').textContent = est;

  // Update summary budget
  buildSummary();
}

// ==================== ADD CAMPAIGN TO QUEST TABLE ====================
function addCampaignToQuestTable() {
  const projName = document.getElementById('cwProjName').value || '새 프로젝트';
  const chain = document.getElementById('cwChain').selectedOptions[0]?.text || 'Ethereum';
  const abbr = projName.slice(0, 2).toUpperCase();
  const gradients = [
    '#6366f1,#818cf8', '#f59e0b,#fbbf24', '#ec4899,#f472b6',
    '#22d3ee,#06b6d4', '#10b981,#34d399', '#8b5cf6,#a78bfa'
  ];
  const grad = gradients[Math.floor(Math.random() * gradients.length)];

  // Collect quest names
  const questNames = [];
  document.querySelectorAll('.wiz-quest-cb:checked').forEach(cb => {
    const n = cb.closest('.wiz-quest-item')?.querySelector('.wq-name')?.textContent;
    if (n) questNames.push(n);
  });
  const questLabel = questNames[0] || '퀘스트';

  // Reward info
  const token = document.getElementById('cwToken').selectedOptions[0]?.text || 'USDT';
  let totalReward = 0;
  document.querySelectorAll('.wiz-qr-input input').forEach(inp => { totalReward += Number(inp.value) || 0; });
  const rewardText = totalReward > 0 ? totalReward + ' ' + token : token;

  // Participants
  const est = document.getElementById('estParticipants').textContent.replace('~', '').replace('명', '');
  const partText = '0 / ' + est;

  const tr = document.createElement('tr');
  tr.className = 'quest-row-new';
  tr.innerHTML =
    '<td><div class="tr-project"><div class="tr-picon" style="background:linear-gradient(135deg,' + grad + ');">' + abbr + '</div><div><div class="tr-pname">' + projName + '</div><div class="tr-chain">' + chain + '</div></div></div></td>' +
    '<td>' + questLabel + (questNames.length > 1 ? ' 외 ' + (questNames.length - 1) + '건' : '') + '</td>' +
    '<td class="tr-mono">' + rewardText + '</td>' +
    '<td class="tr-mono">' + partText + '</td>' +
    '<td><span class="tr-status tr-filling"><span class="dot" style="width:5px;height:5px;border-radius:50%;background:var(--orange);"></span>모집중</span></td>';

  const tbody = document.querySelector('.troom-table tbody');
  tbody.insertBefore(tr, tbody.firstChild);
}

// ==================== CONFETTI ====================
function launchConfetti() {
  const colors = ['#3182F6', '#20C997', '#8B5CF6', '#F59E0B', '#EC4899', '#6366F1', '#22D3EE'];
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  for (let i = 0; i < 80; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDelay = Math.random() * 0.6 + 's';
    p.style.animationDuration = (Math.random() * 1.5 + 2) + 's';
    p.style.width = (Math.random() * 8 + 4) + 'px';
    p.style.height = (Math.random() * 14 + 6) + 'px';
    p.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
    container.appendChild(p);
  }
  setTimeout(() => container.remove(), 4000);
}

function wizGo(dir) {
  const next = wizStep + dir;
  if (next < 1 || next > WIZ_TOTAL + 1) return;
  if (next === 2 && dir === 1) applyQuestRecommendations();
  if (next === 3 && dir === 1) buildStep3();
  if (next === WIZ_TOTAL + 1) {
    // Check all summary items confirmed
    const allChecks = document.querySelectorAll('#wizReview .wr-check');
    const allDone = allChecks.length > 0 && [...allChecks].every(c => c.checked);
    if (!allDone) {
      document.getElementById('wizReview').classList.add('shake');
      setTimeout(() => document.getElementById('wizReview').classList.remove('shake'), 500);
      return;
    }
    // Populate done stats
    const budget = Number(document.getElementById('cwBudget').value) || 0;
    document.getElementById('doneBudget').textContent = '$' + budget.toLocaleString();
    const qCount = document.querySelectorAll('.wiz-quest-cb:checked').length;
    document.getElementById('doneQuests').textContent = qCount + '개';
    document.getElementById('doneEst').textContent = document.getElementById('estParticipants').textContent;
    // Add to quest table
    addCampaignToQuestTable();
    for (let i = 1; i <= WIZ_TOTAL; i++) document.getElementById('wizStep' + i).style.display = 'none';
    document.getElementById('wizDone').style.display = 'block';
    document.getElementById('wizNav').style.display = 'none';
    document.getElementById('wizBar').style.width = '100%';
    updateStepDots(0);
    launchConfetti();
    return;
  }
  document.getElementById('wizStep' + wizStep).style.display = 'none';
  document.getElementById('wizStep' + next).style.display = 'block';
  wizStep = next;
  document.getElementById('wizBar').style.width = ((wizStep / WIZ_TOTAL) * 100) + '%';
  updateStepDots(wizStep);
  document.getElementById('wizPrev').style.display = wizStep === 1 ? 'none' : '';
  document.getElementById('wizNext').textContent = wizStep === WIZ_TOTAL ? '캠페인 시작 🚀' : '다음';
  if (wizStep === WIZ_TOTAL) updateLaunchBtn();
  else document.getElementById('wizNext').classList.remove('disabled');
}

function updateStepDots(step) {
  document.querySelectorAll('.wiz-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i + 1 === step) dot.classList.add('active');
    else if (step > 0 && i + 1 < step) dot.classList.add('done');
  });
}

function closeCampWizard() {
  closeModal('campModal');
  setTimeout(() => {
    wizStep = 1;
    for (let i = 1; i <= WIZ_TOTAL; i++) {
      const el = document.getElementById('wizStep' + i);
      if (el) el.style.display = i === 1 ? 'block' : 'none';
    }
    document.getElementById('wizDone').style.display = 'none';
    document.getElementById('wizNav').style.display = 'flex';
    document.getElementById('wizBar').style.width = '33.33%';
    updateStepDots(1);
    document.getElementById('wizPrev').style.display = 'none';
    document.getElementById('wizNext').textContent = '다음';
    document.getElementById('wizNext').classList.remove('disabled');
    document.getElementById('wizReview').innerHTML = '';
    // Reset selections
    document.querySelectorAll('.wiz-goal').forEach(g => g.classList.remove('selected'));
    document.querySelectorAll('.wiz-ptype').forEach(p => p.classList.remove('selected'));
    document.querySelector('.wiz-ptype[data-ptype="general"]')?.classList.add('selected');
    document.getElementById('followerField').style.display = 'none';
    document.getElementById('contentQuestGroup').style.display = 'none';
  }, 300);
}

// ==================== CTA COUNT-UP ANIMATION ====================
function animateCounter(el, target, duration) {
  const start = performance.now();
  const update = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
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
