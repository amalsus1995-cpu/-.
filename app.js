// مفاتيح التخزين المحلي
const LS_USERS = 'bc_users';
const LS_CURRENT_EMAIL = 'bc_current_user_email';
const LS_INVESTMENTS = 'bc_investments';
const LS_TX = 'bc_transactions';

// محفظة الإدارة (صاحب الموقع)
const ADMIN_WALLET_ADDRESS = 'TPNoGerv1EMBSdrs9Yca93eCQUVsoNiRvq';
const MIN_WITHDRAW_DAYS = 27;

// دوال مساعدة عامة
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}

function getCurrentUserEmail() {
  return localStorage.getItem(LS_CURRENT_EMAIL) || null;
}

function setCurrentUserEmail(email) {
  if (email) localStorage.setItem(LS_CURRENT_EMAIL, email);
  else localStorage.removeItem(LS_CURRENT_EMAIL);
}

function getInvestments() {
  try {
    return JSON.parse(localStorage.getItem(LS_INVESTMENTS)) || [];
  } catch {
    return [];
  }
}

function saveInvestments(items) {
  localStorage.setItem(LS_INVESTMENTS, JSON.stringify(items));
}

function getTransactions() {
  try {
    return JSON.parse(localStorage.getItem(LS_TX)) || [];
  } catch {
    return [];
  }
}

function saveTransactions(items) {
  localStorage.setItem(LS_TX, JSON.stringify(items));
}

function getCurrentUser() {
  const email = getCurrentUserEmail();
  if (!email) return null;
  return getUsers().find(u => u.email === email) || null;
}

function formatDate(d) {
  const date = (d instanceof Date) ? d : new Date(d);
  return date.toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function ensureLoggedIn(redirectIfNot = true) {
  const user = getCurrentUser();
  const userNameSpan = document.getElementById('userName');
  if (userNameSpan) {
    userNameSpan.textContent = user ? user.username : 'غير مسجل';
  }
  if (!user && redirectIfNot) {
    window.location.href = 'auth.html';
    return null;
  }
  return user;
}

// صفحة الاستثمار
let selectedAmount = 0;
function initInvestmentPage() {
  const user = ensureLoggedIn(false);
  const adminBox = document.getElementById('adminWalletBox');
  if (adminBox) adminBox.textContent = ADMIN_WALLET_ADDRESS;

  if (!user) {
    const list = document.getElementById('investmentsList');
    if (list) list.innerHTML = '<div class="small-text">سجّل الدخول أولاً من صفحة الحساب لعرض استثماراتك.</div>';
    return;
  }

  const investments = getInvestments().filter(i => i.email === user.email);
  let total = 0;
  const list = document.getElementById('investmentsList');
  if (!investments.length) {
    if (list) list.textContent = 'لا توجد استثمارات حتى الآن.';
  } else {
    if (list) list.innerHTML = '';
    investments.forEach(inv => {
      total += inv.amount;
      const div = document.createElement('div');
      div.className = 'list-item';
      const created = formatDate(inv.createdAt);
      const canDate = formatDate(inv.canWithdrawFrom);
      div.innerHTML = `
        <div>
          <div>استثمار ${inv.amount} USDT</div>
          <div class="small-text">تاريخ البدء: ${created} - يمكن السحب بعد: ${canDate}</div>
        </div>
        <span class="badge badge-ok">نشط</span>
      `;
      list.appendChild(div);
    });
  }
  const totalSpan = document.getElementById('totalInvestments');
  if (totalSpan) totalSpan.textContent = total.toFixed(2) + ' USDT';

  const modal = document.getElementById('investmentModal');
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeInvestmentModal();
    });
  }
}

function openInvestmentModal(amount) {
  const user = ensureLoggedIn(true);
  if (!user) return;
  selectedAmount = amount;
  const modal = document.getElementById('investmentModal');
  const amountSpan = document.getElementById('modalAmount');
  const profitSpan = document.getElementById('modalProfit');
  const adminBox = document.getElementById('adminWalletBox');
  if (amountSpan) amountSpan.textContent = amount + ' USDT';
  if (profitSpan) profitSpan.textContent = (amount * 0.8).toFixed(2) + ' USDT (80%)';
  if (adminBox) adminBox.textContent = ADMIN_WALLET_ADDRESS;
  if (modal) modal.style.display = 'flex';
}

function closeInvestmentModal() {
  const modal = document.getElementById('investmentModal');
  if (modal) modal.style.display = 'none';
}

function confirmInvestmentFromModal() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }
  if (!selectedAmount || selectedAmount <= 0) return;

  const now = new Date();
  const canWithdrawFrom = new Date(now.getTime() + MIN_WITHDRAW_DAYS * 24 * 60 * 60 * 1000);
  const investments = getInvestments();
  investments.push({
    email: user.email,
    amount: selectedAmount,
    createdAt: now.toISOString(),
    canWithdrawFrom: canWithdrawFrom.toISOString()
  });
  saveInvestments(investments);

  const tx = getTransactions();
  tx.push({
    email: user.email,
    type: 'deposit',
    amount: selectedAmount,
    date: now.toISOString()
  });
  saveTransactions(tx);

  closeInvestmentModal();
  alert('تم تسجيل الاستثمار في حسابك داخل الموقع. تأكد دائماً من نجاح التحويل على محفظتك الشخصية.');
  window.location.reload();
}

// صفحة المحفظة
function initWalletPage() {
  const user = ensureLoggedIn(true);
  if (!user) return;

  const userSpan = document.getElementById('userName');
  if (userSpan) userSpan.textContent = user.username;

  const investments = getInvestments().filter(i => i.email === user.email);
  let total = 0;
  investments.forEach(i => total += i.amount);
  const balanceSpan = document.getElementById('walletBalance');
  if (balanceSpan) balanceSpan.textContent = total.toFixed(2) + ' USDT';

  const tx = getTransactions().filter(t => t.email === user.email);
  const list = document.getElementById('txList');
  if (!tx.length) {
    if (list) list.textContent = 'لا توجد تحويلات حتى الآن.';
  } else if (list) {
    list.innerHTML = '';
    tx.forEach(t => {
      const div = document.createElement('div');
      div.className = 'list-item';
      const date = formatDate(t.date);
      const typeLabel = t.type === 'deposit' ? 'إيداع' : 'سحب';
      const badgeClass = t.type === 'deposit' ? 'badge-ok' : 'badge-warn';
      div.innerHTML = `
        <div>
          <div>${typeLabel} ${t.amount} USDT</div>
          <div class="small-text">${date}</div>
        </div>
        <span class="badge ${badgeClass}">${t.type === 'deposit' ? 'وارد' : 'طلب سحب'}</span>
      `;
      list.appendChild(div);
    });
  }

  const info = document.getElementById('withdrawInfo');
  if (investments.length && info) {
    const first = investments.reduce((min, i) => i.createdAt < min.createdAt ? i : min, investments[0]);
    const firstDate = new Date(first.createdAt);
    const canDate = new Date(firstDate.getTime() + MIN_WITHDRAW_DAYS * 24 * 60 * 60 * 1000);
    info.textContent = 'أول استثمار لك بتاريخ ' + formatDate(firstDate) +
      '. يمكن السحب بعد: ' + formatDate(canDate) + '.';
  }
}

function requestWithdraw() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }
  const errorEl = document.getElementById('withdrawError');
  if (errorEl) errorEl.textContent = '';

  const addr = document.getElementById('userWithdrawAddress').value.trim();
  const amountStr = document.getElementById('userWithdrawAmount').value.trim();
  const amount = parseFloat(amountStr || '0');

  if (!addr) {
    if (errorEl) errorEl.textContent = 'يرجى إدخال عنوان محفظتك.';
    return;
  }
  if (!amount || amount <= 0) {
    if (errorEl) errorEl.textContent = 'يرجى إدخال مبلغ صالح.';
    return;
  }

  const investments = getInvestments().filter(i => i.email === user.email);
  if (!investments.length) {
    if (errorEl) errorEl.textContent = 'لا توجد استثمارات مسجلة في حسابك.';
    return;
  }

  const now = new Date();
  const first = investments.reduce((min, i) => i.createdAt < min.createdAt ? i : min, investments[0]);
  const firstDate = new Date(first.createdAt);
  const canDate = new Date(firstDate.getTime() + MIN_WITHDRAW_DAYS * 24 * 60 * 60 * 1000);
  if (now < canDate) {
    if (errorEl) errorEl.textContent = 'لا يمكنك السحب قبل مرور 27 يوم من أول استثمار. تاريخ السماح بالسحب: ' + formatDate(canDate);
    return;
  }

  let total = 0;
  investments.forEach(i => total += i.amount);
  if (amount > total) {
    if (errorEl) errorEl.textContent = 'المبلغ المطلوب أكبر من رصيد استثماراتك المسجلة.';
    return;
  }

  const tx = getTransactions();
  tx.push({
    email: user.email,
    type: 'withdraw',
    amount,
    date: now.toISOString(),
    toAddress: addr
  });
  saveTransactions(tx);

  alert('تم تسجيل طلب السحب داخل الموقع (تجريبي). يجب تنفيذ السحب يدوياً من قبل الإدارة.');
  window.location.reload();
}

// صفحة الملف الشخصي
function initProfilePage() {
  const user = ensureLoggedIn(true);
  if (!user) return;

  const userSpan = document.getElementById('userName');
  if (userSpan) userSpan.textContent = user.username;

  const uName = document.getElementById('profileUsername');
  const uEmail = document.getElementById('profileEmail');
  const uCreated = document.getElementById('profileCreatedAt');
  if (uName) uName.textContent = user.username;
  if (uEmail) uEmail.textContent = user.email;
  if (uCreated) uCreated.textContent = formatDate(user.createdAt);
}

function changePassword() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }
  const newPass = document.getElementById('newPassword').value;
  const newPass2 = document.getElementById('confirmPassword').value;
  const err = document.getElementById('passwordError');
  const info = document.getElementById('passwordInfo');
  if (err) err.textContent = '';
  if (info) info.textContent = '';

  if (!newPass || newPass.length < 4) {
    if (err) err.textContent = 'كلمة المرور يجب أن تكون 4 أحرف على الأقل.';
    return;
  }
  if (newPass !== newPass2) {
    if (err) err.textContent = 'كلمتا المرور غير متطابقتين.';
    return;
  }

  const users = getUsers();
  const idx = users.findIndex(u => u.email === user.email);
  if (idx !== -1) {
    users[idx].password = newPass;
    saveUsers(users);
    if (info) info.textContent = 'تم تحديث كلمة المرور بنجاح.';
  }
}

function logout() {
  setCurrentUserEmail(null);
  window.location.href = 'auth.html';
}

// لوحة التحكم
function initDashboardPage() {
  ensureLoggedIn(false);
}

// صفحة auth
function initAuthPage() {
  const user = getCurrentUser();
  if (user) {
    const info = document.getElementById('authInfo');
    if (info) info.textContent = 'أنت مسجّل الدخول بالفعل كـ ' + user.email + '. يمكنك الذهاب مباشرة إلى صفحة الاستثمار.';
  }
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const err = document.getElementById('authError');
  const info = document.getElementById('authInfo');
  if (err) err.textContent = '';
  if (info) info.textContent = '';

  if (tab === 'login') {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }
}

function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const err = document.getElementById('authError');
  const info = document.getElementById('authInfo');
  if (err) err.textContent = '';
  if (info) info.textContent = '';

  if (!email || !password) {
    if (err) err.textContent = 'يرجى إدخال البريد الإلكتروني وكلمة المرور.';
    return;
  }

  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    if (err) err.textContent = 'بيانات الدخول غير صحيحة.';
    return;
  }

  setCurrentUserEmail(email);
  if (info) info.textContent = 'تم تسجيل الدخول بنجاح، سيتم تحويلك إلى صفحة الاستثمار.';
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 700);
}

function handleRegister() {
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const password = document.getElementById('regPassword').value;
  const password2 = document.getElementById('regPassword2').value;
  const err = document.getElementById('authError');
  const info = document.getElementById('authInfo');
  if (err) err.textContent = '';
  if (info) info.textContent = '';

  if (!username || !email || !password || !password2) {
    if (err) err.textContent = 'يرجى تعبئة جميع الحقول.';
    return;
  }
  if (password.length < 4) {
    if (err) err.textContent = 'كلمة المرور يجب أن تكون 4 أحرف على الأقل.';
    return;
  }
  if (password !== password2) {
    if (err) err.textContent = 'كلمتا المرور غير متطابقتين.';
    return;
  }

  const users = getUsers();
  if (users.find(u => u.email === email)) {
    if (err) err.textContent = 'هذا البريد الإلكتروني مستخدم من قبل.';
    return;
  }

  const now = new Date().toISOString();
  users.push({
    username,
    email,
    password,
    createdAt: now
  });
  saveUsers(users);
  setCurrentUserEmail(email);

  if (info) info.textContent = 'تم إنشاء الحساب وتسجيل الدخول، سيتم تحويلك إلى صفحة الاستثمار.';
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 700);
}
