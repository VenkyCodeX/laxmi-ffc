// ── VEG MODE ─────────────────────────────────────────────
let vegMode = false;

function toggleVegMode(on) {
  vegMode = on;
  const wrap = document.querySelector('.menu-search-wrap');
  wrap.classList.toggle('veg-mode-on', on);
  const activeFilter = document.querySelector('.cat-btn.active')?.dataset.filter || 'all';
  filterMenu(activeFilter, document.getElementById('menuSearch').value);
}

// ── CATEGORY FILTER ──────────────────────────────────────
document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterMenu(btn.dataset.filter, document.getElementById('menuSearch').value);
  });
});

// ── SEARCH ────────────────────────────────────────────────
function searchMenu(val) {
  const clear = document.getElementById('searchClear');
  clear.style.display = val ? 'block' : 'none';
  const activeFilter = document.querySelector('.cat-btn.active')?.dataset.filter || 'all';
  filterMenu(activeFilter, val);
}

function clearSearch() {
  document.getElementById('menuSearch').value = '';
  document.getElementById('searchClear').style.display = 'none';
  const activeFilter = document.querySelector('.cat-btn.active')?.dataset.filter || 'all';
  filterMenu(activeFilter, '');
}

function filterMenu(category, search) {
  const cards = document.querySelectorAll('.mp-card');
  const q = (search || '').toLowerCase().trim();
  let visible = 0;
  cards.forEach(card => {
    const matchCat  = category === 'all' || card.dataset.category === category;
    const matchName = !q || card.dataset.name.includes(q);
    const veg       = card.dataset.veg; // 'yes', 'no', 'both'
    const matchVeg  = veg === 'both' || (vegMode ? veg === 'yes' : true);
    const show = matchCat && matchName && matchVeg;
    card.classList.toggle('hidden', !show);
    if (show) visible++;
  });
  document.getElementById('menuNoResults').style.display = visible === 0 ? 'block' : 'none';
}

// ── SYNC BOTTOM NAV CART COUNT ────────────────────────────
const _origUpdateCartUI = updateCartUI;
updateCartUI = function() {
  _origUpdateCartUI();
  const count = getCartCount();
  const el = document.getElementById('bnavCartCount');
  if (el) {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  }
};

// init hide badge if 0
(function() {
  const el = document.getElementById('bnavCartCount');
  if (el) el.style.display = getCartCount() > 0 ? 'flex' : 'none';
})();

// ── MENU LANGUAGE ─────────────────────────────────────────
const menuLang = {
  en: {
    searchPlaceholder: 'Search dishes...',
    vegLabel: '🌿 Veg',
    catAll: 'All', catNoodles: 'Noodles', catRice: 'Rice', catStarters: 'Starters', catDrinks: 'Drinks',
    noResults: 'No dishes found',
    cartHeader: 'Your Order', cartEmpty: 'Your cart is empty', cartEmptySub: 'Add items from the menu',
    cartTotal: 'Total', placeOrder: 'Place Order',
    orderModalTitle: 'Complete Your Order',
    labelName: 'Your Name', labelPhone: 'Phone Number', labelAddress: 'Delivery Address',
    placeName: 'Enter your full name', placePhone: '10-digit mobile number', placeAddress: 'Enter your full delivery address',
    useLocation: 'Use Location', confirmOrder: 'Confirm Order',
    successTitle: 'Order Placed!', continueBrowsing: 'Continue', waConfirmBtn: 'WhatsApp',
    myOrdersTitle: 'My Orders Today', myOrdersLabel: 'Enter your phone number',
    langBtn: '🌐 हिंदी',
    bnHome: 'Home', bnMenu: 'Menu', bnSearch: 'Search', bnCart: 'Cart', bnProfile: 'Profile'
  },
  hi: {
    searchPlaceholder: 'व्यंजन खोजें...',
    vegLabel: '🌿 वेज',
    catAll: 'सभी', catNoodles: 'नूडल्स', catRice: 'राइस', catStarters: 'स्टार्टर', catDrinks: 'ड्रिंक्स',
    noResults: 'कोई व्यंजन नहीं मिला',
    cartHeader: 'आपका ऑर्डर', cartEmpty: 'कार्ट खाली है', cartEmptySub: 'मेनू से आइटम जोड़ें',
    cartTotal: 'कुल', placeOrder: 'ऑर्डर करें',
    orderModalTitle: 'ऑर्डर पूरा करें',
    labelName: 'आपका नाम', labelPhone: 'फोन नंबर', labelAddress: 'डिलीवरी पता',
    placeName: 'अपना पूरा नाम दर्ज करें', placePhone: '10 अंकों का मोबाइल नंबर', placeAddress: 'अपना पूरा डिलीवरी पता दर्ज करें',
    useLocation: 'लोकेशन', confirmOrder: 'ऑर्डर कन्फर्म करें',
    successTitle: 'ऑर्डर हो गया!', continueBrowsing: 'जारी रखें', waConfirmBtn: 'व्हाट्सएप',
    myOrdersTitle: 'आज के मेरे ऑर्डर', myOrdersLabel: 'अपना फोन नंबर दर्ज करें',
    langBtn: '🌐 English',
    bnHome: 'होम', bnMenu: 'मेनू', bnSearch: 'खोजें', bnCart: 'कार्ट', bnProfile: 'प्रोफाइल'
  }
};

function applyMenuLanguage(lang) {
  const t = menuLang[lang];
  const q = sel => document.querySelector(sel);
  const qa = sel => document.querySelectorAll(sel);

  const searchInput = document.getElementById('menuSearch');
  if (searchInput) searchInput.placeholder = t.searchPlaceholder;

  const vegLabel = q('.veg-toggle-label');
  if (vegLabel) vegLabel.textContent = t.vegLabel;

  const catBtns = qa('.cat-btn span:last-child');
  ['catAll','catNoodles','catRice','catStarters','catDrinks'].forEach((k, i) => {
    if (catBtns[i]) catBtns[i].textContent = t[k];
  });

  const noRes = q('.menu-no-results p');
  if (noRes) noRes.textContent = t.noResults;

  const cartH = q('.cart-header h3');
  if (cartH) cartH.innerHTML = `<i class="fas fa-shopping-bag"></i> ${t.cartHeader}`;
  const cartEmptyP = q('.cart-empty p');
  if (cartEmptyP) cartEmptyP.textContent = t.cartEmpty;
  const cartEmptySpan = q('.cart-empty span');
  if (cartEmptySpan) cartEmptySpan.textContent = t.cartEmptySub;
  const cartTotalLabel = q('.cart-total span:first-child');
  if (cartTotalLabel) cartTotalLabel.textContent = t.cartTotal;
  const placeOrderBtn = q('.cart-footer .btn-primary');
  if (placeOrderBtn) placeOrderBtn.innerHTML = `<i class="fas fa-paper-plane"></i> ${t.placeOrder}`;

  const orderModalTitle = q('#orderModal .modal-header h3');
  if (orderModalTitle) orderModalTitle.innerHTML = `<i class="fas fa-receipt"></i> ${t.orderModalTitle}`;
  const formGroups = qa('#orderForm .form-group');
  if (formGroups[0]) formGroups[0].querySelector('label').innerHTML = `<i class="fas fa-user"></i> ${t.labelName}`;
  if (formGroups[1]) formGroups[1].querySelector('label').innerHTML = `<i class="fas fa-phone"></i> ${t.labelPhone}`;
  if (formGroups[2]) {
    const addrLabel = formGroups[2].querySelector('label');
    const locBtn = addrLabel.querySelector('.loc-btn');
    if (locBtn) locBtn.innerHTML = `<i class="fas fa-crosshairs"></i> ${t.useLocation}`;
    addrLabel.querySelector('span').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${t.labelAddress}`;
  }
  const custName = document.getElementById('custName');
  if (custName) custName.placeholder = t.placeName;
  const custPhone = document.getElementById('custPhone');
  if (custPhone) custPhone.placeholder = t.placePhone;
  const custAddress = document.getElementById('custAddress');
  if (custAddress) custAddress.placeholder = t.placeAddress;
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.innerHTML = `<i class="fas fa-check-circle"></i> ${t.confirmOrder}`;

  const successH3 = q('.success-modal h3');
  if (successH3) successH3.textContent = t.successTitle;
  const contBtn = q('.success-btns .btn-primary');
  if (contBtn) contBtn.textContent = t.continueBrowsing;
  const waBtn = document.getElementById('waConfirm');
  if (waBtn) waBtn.innerHTML = `<i class="fab fa-whatsapp"></i> ${t.waConfirmBtn}`;

  const myOrdersH3 = q('#myOrdersModal .modal-header h3');
  if (myOrdersH3) myOrdersH3.innerHTML = `<i class="fas fa-receipt"></i> ${t.myOrdersTitle}`;
  const myOrdersLbl = q('#myOrdersOverlay .form-group label');
  if (myOrdersLbl) myOrdersLbl.innerHTML = `<i class="fas fa-phone"></i> ${t.myOrdersLabel}`;

  const langBtn = document.getElementById('menuLangBtn');
  if (langBtn) langBtn.textContent = t.langBtn;

  const bnLabels = qa('.bnav-item span:not(.bnav-cart-count)');
  ['bnHome','bnMenu','bnSearch','bnCart','bnProfile'].forEach((k, i) => {
    if (bnLabels[i]) bnLabels[i].textContent = t[k];
  });
}

function toggleMenuLanguage() {
  const next = (localStorage.getItem('lff_lang') || 'en') === 'hi' ? 'en' : 'hi';
  localStorage.setItem('lff_lang', next);
  applyMenuLanguage(next);
}

// Apply saved language on load
(function() {
  const saved = localStorage.getItem('lff_lang') || 'en';
  if (saved === 'hi') applyMenuLanguage('hi');
})();
