// ── BACKEND URL (auto-detect) ───────────────────────────
const PROFILE_API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api/orders'
  : 'https://laxmi-ffc-backend.onrender.com/api/orders';

// ── AVATAR PHOTO ─────────────────────────────────────────
function handleAvatarChange(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    localStorage.setItem('lff_avatar', base64);
    applyAvatar(base64);
  };
  reader.readAsDataURL(file);
}

function applyAvatar(src) {
  const img  = document.getElementById('profileAvatarImg');
  const text = document.getElementById('profileAvatarText');
  if (src) {
    img.src = src;
    img.style.display = 'block';
    text.style.display = 'none';
  } else {
    img.style.display = 'none';
    text.style.display = 'block';
  }
}

// ── PROFILE PAGE LOGIC ───────────────────────────────────
function loadProfilePage() {
  const user = getUser();

  if (!user) {
    document.getElementById('profileNoUser').style.display        = 'block';
    document.getElementById('profileCard').style.display          = 'none';
    document.getElementById('profileActions').style.display       = 'none';
    document.getElementById('orderHistorySection').style.display  = 'none';
    document.getElementById('profileAvatarText').textContent      = '?';
    document.getElementById('profileName').textContent            = 'Guest User';
    document.getElementById('profilePhone').textContent           = 'No profile saved';
    applyAvatar(null);
    document.getElementById('orderHistoryList').innerHTML = '';
    return;
  }

  document.getElementById('profileNoUser').style.display        = 'none';
  document.getElementById('profileCard').style.display          = 'block';
  document.getElementById('profileActions').style.display       = 'grid';
  document.getElementById('orderHistorySection').style.display  = 'block';

  // Avatar — photo or initials
  const savedAvatar = localStorage.getItem('lff_avatar');
  if (savedAvatar) {
    applyAvatar(savedAvatar);
  } else {
    const initials = user.name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('profileAvatarText').textContent = initials;
    applyAvatar(null);
  }
  document.getElementById('profileName').textContent    = user.name;
  document.getElementById('profilePhone').textContent   = '📞 ' + user.phone;

  // Fields
  document.getElementById('pfName').textContent    = user.name;
  document.getElementById('pfPhone').textContent   = user.phone;
  document.getElementById('pfAddress').textContent = user.address || '—';
}

function toggleProfilePageEdit() {
  const view = document.getElementById('profileViewMode');
  const edit = document.getElementById('profileEditMode');
  const btn  = document.getElementById('profileEditBtn');
  const user = getUser();

  if (edit.style.display === 'none') {
    // Enter edit mode
    document.getElementById('editName').value    = user ? user.name    : '';
    document.getElementById('editPhone').value   = user ? user.phone   : '';
    document.getElementById('editAddress').value = user ? user.address : '';
    view.style.display = 'none';
    edit.style.display = 'block';
    btn.innerHTML = '<i class="fas fa-times"></i> Cancel';
  } else {
    cancelProfileEdit();
  }
}

function saveProfileEdit() {
  const name    = document.getElementById('editName').value.trim();
  const phone   = document.getElementById('editPhone').value.trim();
  const address = document.getElementById('editAddress').value.trim();

  if (!name)  { showToast('Please enter your name'); return; }
  if (phone.length !== 10) { showToast('Enter a valid 10-digit phone'); return; }

  saveUser(name, phone, address);
  cancelProfileEdit();
  loadProfilePage();
  showToast('Profile saved!');
}

function cancelProfileEdit() {
  document.getElementById('profileViewMode').style.display = 'block';
  document.getElementById('profileEditMode').style.display = 'none';
  document.getElementById('profileEditBtn').innerHTML = '<i class="fas fa-pen"></i> Edit';
}

function logoutProfile() {
  if (!confirm('Are you sure you want to logout?')) return;
  localStorage.removeItem('laxmiUser');
  localStorage.removeItem('lff_phone');
  localStorage.removeItem('lff_avatar');
  loadProfilePage();
  loadOrderHistory();
  showToast('Logged out successfully!');
}

function clearProfile() {
  if (!confirm('Clear your saved profile?')) return;
  localStorage.removeItem('laxmiUser');
  localStorage.removeItem('lff_phone');
  localStorage.removeItem('lff_avatar');
  applyAvatar(null);
  document.getElementById('profileAvatarText').textContent = '?';
  loadProfilePage();
  showToast('Profile cleared!');
}

// ── ORDER HISTORY ────────────────────────────────────────
async function loadOrderHistory() {
  const user = getUser();
  const list = document.getElementById('orderHistoryList');
  if (!list) return;

  if (!user) {
    list.innerHTML = `
      <div class="oh-empty">
        <i class="fas fa-receipt"></i>
        <p>No orders yet</p>
        <span>Place an order to see your history here</span>
        <a href="menu.html" class="btn btn-primary oh-menu-btn"><i class="fas fa-utensils"></i> Order Now</a>
      </div>`;
    return;
  }

  list.innerHTML = '<div class="oh-loading"><i class="fas fa-spinner fa-spin"></i> Loading orders...</div>';

  try {
    const res  = await fetch(PROFILE_API + '/by-phone/' + user.phone);
    const data = await res.json();

    if (!data.length) {
      list.innerHTML = `
        <div class="oh-empty">
          <i class="fas fa-receipt"></i>
          <p>No orders found</p>
          <span>Your order history will appear here</span>
          <a href="menu.html" class="btn btn-primary oh-menu-btn"><i class="fas fa-utensils"></i> Go to Menu</a>
        </div>`;
      return;
    }

    const statusColor = { 'Order Received': '#ffc107', 'Preparing': '#2196f3', 'Ready': '#9c27b0', 'Completed': '#4caf50' };
    list.innerHTML = data.map(o => {
      const d    = new Date(o.orderTime);
      const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const color = statusColor[o.orderStatus] || '#888';
      return `
        <div class="oh-card">
          <div class="oh-card-top">
            <div class="oh-meta">
              <span class="oh-id">🆔 ${o.orderId || o._id.slice(-8).toUpperCase()}</span>
              <span class="oh-datetime"><i class="fas fa-calendar-alt"></i> ${date} &nbsp;<i class="fas fa-clock"></i> ${time}</span>
            </div>
            <span class="oh-status" style="color:${color};border-color:${color}40">${o.orderStatus}</span>
          </div>
          <div class="oh-items">
            ${o.itemsOrdered.map(i => `<span>• ${i.name} ×${i.quantity}</span>`).join('')}
          </div>
          <div class="oh-footer">
            <span class="oh-total">₹${o.totalAmount}</span>
            <span class="oh-addr"><i class="fas fa-map-marker-alt"></i> ${o.address || '—'}</span>
          </div>
        </div>`;
    }).join('');
  } catch {
    list.innerHTML = `
      <div class="oh-empty">
        <i class="fas fa-wifi"></i>
        <p>Could not load orders</p>
        <span>Check your internet connection</span>
        <button class="btn btn-primary oh-menu-btn" onclick="loadOrderHistory()"><i class="fas fa-sync-alt"></i> Retry</button>
      </div>`;
  }
}

// ── INIT ─────────────────────────────────────────────────
loadProfilePage();
loadOrderHistory();

// Auto-fill My Orders phone if user exists
const user = getUser();
if (user) {
  document.getElementById('myOrdersPhone').value = user.phone;
}

// ── LANGUAGE ─────────────────────────────────────────────
const profileTranslations = {
  en: {
    topbarTitle: 'MY PROFILE', langBtn: '🌐 हिंदी',
    personalInfo: 'Personal Info', edit: 'Edit', cancel: 'Cancel', save: 'Save',
    name: 'Name', phone: 'Phone', address: 'Address',
    myOrders: 'My Orders', callUs: 'Call Us', whatsapp: 'WhatsApp', logout: 'Logout',
    orderHistory: 'Order History', refresh: 'Refresh',
    guestUser: 'Guest User', noProfile: 'No profile saved',
    noUserMsg: 'No profile saved yet',
    noUserSub: 'Place an order to save your details automatically',
    orderNow: 'Order Now', hours: 'Hours', appVersion: 'App Version'
  },
  hi: {
    topbarTitle: 'मेरा प्रोफाइल', langBtn: '🌐 English',
    personalInfo: 'व्यक्तिगत जानकारी', edit: 'संपादित करें', cancel: 'रद्द करें', save: 'सहेजें',
    name: 'नाम', phone: 'फोन', address: 'पता',
    myOrders: 'मेरे ऑर्डर', callUs: 'कॉल करें', whatsapp: 'व्हाट्सएप', logout: 'लॉगआउट',
    orderHistory: 'ऑर्डर इतिहास', refresh: 'रिफ्रेश',
    guestUser: 'अतिथि उपयोगकर्ता', noProfile: 'कोई प्रोफाइल नहीं',
    noUserMsg: 'अभी तक कोई प्रोफाइल नहीं है',
    noUserSub: 'ऑर्डर देने पर आपकी जानकारी स्वचालित सहेजी जाएगी',
    orderNow: 'अभी ऑर्डर करें', hours: 'समय', appVersion: 'एप वर्शन'
  }
};

let profileLang = localStorage.getItem('lff_lang') || 'en';

function applyProfileLanguage(lang) {
  const t = profileTranslations[lang];
  const q = id => document.getElementById(id);
  const qs = sel => document.querySelector(sel);

  q('profileTopbarTitle').textContent = t.topbarTitle;
  q('profileLangBtn').textContent     = t.langBtn;

  // Personal info card
  qs('.profile-card-header span').innerHTML = `<i class="fas fa-user"></i> ${t.personalInfo}`;
  q('profileEditBtn').innerHTML = `<i class="fas fa-pen"></i> ${t.edit}`;

  // Field labels
  const labels = document.querySelectorAll('.pf-label');
  if (labels[0]) labels[0].innerHTML = `<i class="fas fa-user"></i> ${t.name}`;
  if (labels[1]) labels[1].innerHTML = `<i class="fas fa-phone"></i> ${t.phone}`;
  if (labels[2]) labels[2].innerHTML = `<i class="fas fa-map-marker-alt"></i> ${t.address}`;

  // Quick actions
  const spans = document.querySelectorAll('.paction-btn span');
  if (spans[0]) spans[0].textContent = t.myOrders;
  if (spans[1]) spans[1].textContent = t.callUs;
  if (spans[2]) spans[2].textContent = t.whatsapp;
  if (spans[3]) spans[3].textContent = t.logout;

  // Order history
  const ohHeader = qs('#orderHistorySection .profile-card-header span');
  if (ohHeader) ohHeader.innerHTML = `<i class="fas fa-history"></i> ${t.orderHistory}`;
  const ohRefresh = qs('#orderHistorySection .profile-edit-btn');
  if (ohRefresh) ohRefresh.innerHTML = `<i class="fas fa-sync-alt"></i> ${t.refresh}`;

  // No user state
  qs('.profile-no-user p').textContent    = t.noUserMsg;
  qs('.profile-no-user span').textContent = t.noUserSub;
}

function toggleProfileLanguage() {
  profileLang = profileLang === 'en' ? 'hi' : 'en';
  localStorage.setItem('lff_lang', profileLang);
  applyProfileLanguage(profileLang);
}

// Apply saved language on load
applyProfileLanguage(profileLang);
