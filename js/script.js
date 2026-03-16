// ── CONFIG ───────────────────────────────────────────────
const BACKEND   = 'http://localhost:5000';
const API_URL   = BACKEND + '/api/orders';
const OTP_URL   = BACKEND + '/api/otp';
const WA_NUMBER = '9321611315';
const SHOP_OPEN  = 11;
const SHOP_CLOSE = 23;

let appliedCoupon = null;

// ── CART STATE ───────────────────────────────────────────
let cart = [];
sessionStorage.removeItem('lff_cart');
let lastOrderItems = [];

function saveCart() { sessionStorage.setItem('lff_cart', JSON.stringify(cart)); }

// ── ORDER SOUND ──────────────────────────────────────────
function playOrderSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523, 659, 784].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.3);
    });
  } catch {}
}

// ── SHOP STATUS ──────────────────────────────────────────
function updateShopStatus() {
  const hour   = new Date().getHours();
  const isOpen = hour >= SHOP_OPEN && hour < SHOP_CLOSE;
  const dot    = document.getElementById('shopDot');
  const text   = document.getElementById('shopStatusText');
  if (!dot || !text) return;
  dot.className    = 'shop-status-dot ' + (isOpen ? 'open' : 'closed');
  text.textContent = isOpen ? '🟢 Open Now' : '🔴 Closed Now';
  text.style.color = isOpen ? '#4caf50' : '#ff4444';
}

// ── NAVBAR SCROLL ────────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.style.background     = window.scrollY > 50 ? 'rgba(0,0,0,0.95)' : 'transparent';
  navbar.style.backdropFilter = window.scrollY > 50 ? 'blur(12px)' : 'none';
});

// ── HAMBURGER ────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');
hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(l =>
  l.addEventListener('click', () => navLinks.classList.remove('open'))
);

// ── MENU FILTER ──────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    document.querySelectorAll('.menu-card').forEach(card => {
      const show = filter === 'all' || card.dataset.category === filter;
      card.style.display = show ? 'block' : 'none';
      if (show) card.style.animation = 'fadeInUp 0.4s ease forwards';
    });
  });
});

// ── CART FUNCTIONS ───────────────────────────────────────
function addToCart(name, price) {
  const existing = cart.find(i => i.name === name);
  existing ? existing.quantity++ : cart.push({ name, price, quantity: 1 });
  saveCart();
  updateCartUI();
  showToast(`${name} added to cart!`);
  bumpFloatingCart();
}

function removeFromCart(name) {
  const idx = cart.findIndex(i => i.name === name);
  if (idx === -1) return;
  cart[idx].quantity > 1 ? cart[idx].quantity-- : cart.splice(idx, 1);
  saveCart();
  updateCartUI();
}

function getCartTotal() { return cart.reduce((s, i) => s + i.price * i.quantity, 0); }
function getCartCount() { return cart.reduce((s, i) => s + i.quantity, 0); }

function updateCartUI() {
  const count = getCartCount();
  ['cartNavCount', 'cartFloatCount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  });

  const cartItemsEl = document.getElementById('cartItems');
  const cartFooter  = document.getElementById('cartFooter');
  const cartTotalEl = document.getElementById('cartTotalAmt');

  if (!cart.length) {
    cartItemsEl.innerHTML = `
      <div class="cart-empty">
        <i class="fas fa-bowl-food"></i>
        <p>Your cart is empty</p>
        <span>Add items from the menu</span>
      </div>`;
    cartFooter.style.display = 'none';
    return;
  }

  cartFooter.style.display = 'block';
  cartTotalEl.textContent  = `₹${getCartTotal()}`;
  cartItemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div style="flex:1">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₹${item.price * item.quantity}</div>
      </div>
      <div class="cart-qty">
        <button onclick="removeFromCart('${item.name}')"><i class="fas fa-minus"></i></button>
        <span>${item.quantity}</span>
        <button onclick="addToCart('${item.name}',${item.price})"><i class="fas fa-plus"></i></button>
      </div>
    </div>`).join('');
}

// ── CART SIDEBAR TOGGLE ──────────────────────────────────
function toggleCart() {
  const sidebar = document.getElementById('cartSidebar');
  const overlay = document.getElementById('cartOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
  document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

function bumpFloatingCart() {
  const fc = document.getElementById('floatingCart');
  fc.classList.add('bump');
  setTimeout(() => fc.classList.remove('bump'), 500);
}

// ── TOAST ────────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('orderToast');
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── USER PROFILE ─────────────────────────────────────────
function getUser() {
  return JSON.parse(localStorage.getItem('laxmiUser') || 'null');
}

function saveUser(name, phone, address) {
  localStorage.setItem('laxmiUser', JSON.stringify({ name, phone, address }));
  localStorage.setItem('lff_phone', phone);
  updateUserLogoutBtn();
}

function updateUserLogoutBtn() {
  const user = getUser();
  const btn  = document.getElementById('userLogoutBtn');
  if (!btn) return;
  if (user) {
    btn.style.display = 'inline-flex';
    document.getElementById('userLogoutName').textContent = user.name.split(' ')[0];
  } else {
    btn.style.display = 'none';
  }
}

function logoutUser() {
  if (!confirm('Clear your saved profile?')) return;
  localStorage.removeItem('laxmiUser');
  localStorage.removeItem('lff_phone');
  updateUserLogoutBtn();
  showToast('Profile cleared!');
}

function applyUserToForm() {
  const user = getUser();
  if (!user) return;
  document.getElementById('custName').value    = user.name;
  document.getElementById('custPhone').value   = user.phone;
  document.getElementById('custAddress').value = user.address;
  showAddressAndSubmit();
  const banner = document.getElementById('savedProfileBanner');
  if (banner) {
    document.getElementById('spbName').textContent  = '👤 ' + user.name;
    document.getElementById('spbPhone').textContent = '📞 ' + user.phone;
    banner.style.display = 'flex';
  }
}

function toggleProfileEdit() {
  const form    = document.getElementById('orderForm');
  const btn     = document.querySelector('.spb-edit-btn');
  const locked = form.classList.contains('form-fields-locked');
  if (locked) {
    form.classList.remove('form-fields-locked');
    btn.innerHTML = '<i class="fas fa-check"></i> Done';
    document.getElementById('custName').focus();
  } else {
    form.classList.add('form-fields-locked');
    btn.innerHTML = '<i class="fas fa-pen"></i> Edit';
  }
}

function useMyLocation() {
  const btn = document.querySelector('.loc-btn');
  if (!navigator.geolocation) { showToast('Geolocation not supported'); return; }
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`)
        .then(r => r.json())
        .then(d => {
          const parts = [
            d.locality || d.city,
            d.principalSubdivision,
            d.countryName
          ].filter(Boolean);
          document.getElementById('custAddress').value = parts.length ? parts.join(', ') : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        })
        .catch(() => {
          document.getElementById('custAddress').value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        })
        .finally(() => {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-crosshairs"></i> Use Location';
        });
    },
    err => {
      showToast(err.code === 1 ? 'Location permission denied' : 'Could not get location');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-crosshairs"></i> Use Location';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function showAddressAndSubmit() {
  const otpRow    = document.getElementById('otpRow');
  const addrRow   = document.getElementById('addressRow');
  const couponRow = document.getElementById('couponRow');
  const subBtn    = document.getElementById('submitBtn');
  const sendBtn   = document.getElementById('sendOtpBtn');
  if (otpRow)    otpRow.style.display    = 'none';
  if (addrRow)   addrRow.style.display   = 'block';
  if (couponRow) couponRow.style.display = 'block';
  if (subBtn)    subBtn.style.display    = 'block';
  if (sendBtn)   { sendBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verified'; sendBtn.disabled = true; }
  document.getElementById('custPhone').readOnly = true;
}

async function sendOTP() {
  const phone = document.getElementById('custPhone').value.trim();
  if (!/^\d{10}$/.test(phone)) { showToast('Enter a valid 10-digit number'); return; }

  const btn = document.getElementById('sendOtpBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    const res  = await fetch(OTP_URL + '/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Failed to send OTP');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sms"></i> Send OTP';
      return;
    }
    document.getElementById('otpRow').style.display  = 'block';
    document.getElementById('otpStatus').textContent = '✅ OTP sent to your mobile number!';
    document.getElementById('otpStatus').style.color = '#4caf50';
    document.getElementById('otpInput').value        = '';
    document.getElementById('otpInput').focus();
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sms"></i> Resend';
  } catch {
    showToast('Could not connect. Is the backend running?');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sms"></i> Send OTP';
  }
}

async function verifyOTP() {
  const phone = document.getElementById('custPhone').value.trim();
  const otp   = document.getElementById('otpInput').value.trim();
  if (otp.length !== 6) { showToast('Enter the 6-digit OTP'); return; }

  const btn = document.getElementById('verifyOtpBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    const res  = await fetch(OTP_URL + '/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('otpStatus').textContent = '✅ Verified!';
      document.getElementById('otpStatus').style.color = '#4caf50';
      showAddressAndSubmit();
      showToast('Phone verified!');
    } else {
      showToast(data.error || 'Incorrect OTP. Try again.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> Verify';
    }
  } catch {
    showToast('Could not connect. Is the backend running?');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check"></i> Verify';
  }
}

// ── ORDER FORM ───────────────────────────────────────────
function showOrderForm() {
  if (!cart.length) { showToast('Add items to cart first!'); return; }

  const sidebar = document.getElementById('cartSidebar');
  const overlay = document.getElementById('cartOverlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
  document.body.style.overflow = '';

  setTimeout(_openOrderModal, 320);
}

function _openOrderModal() {
  document.getElementById('orderSummary').innerHTML = `
    <h4>Order Summary</h4>
    ${cart.map(i => `
      <div class="summary-item">
        <span>${i.name} x${i.quantity}</span>
        <span>₹${i.price * i.quantity}</span>
      </div>`).join('')}
    <div class="summary-total"><span>Total</span><span>₹${getCartTotal()}</span></div>`;

  appliedCoupon   = null;
  document.getElementById('orderForm').classList.remove('form-fields-locked');

  const otpRow     = document.getElementById('otpRow');
  const addressRow = document.getElementById('addressRow');
  const couponRow  = document.getElementById('couponRow');
  const submitBtn2 = document.getElementById('submitBtn');
  const sendBtn    = document.getElementById('sendOtpBtn');
  const verifyBtn  = document.getElementById('verifyOtpBtn');
  const hasOtp     = !!otpRow;

  if (otpRow)      otpRow.style.display      = 'none';
  if (addressRow) addressRow.style.display = 'none';
  if (couponRow)  couponRow.style.display  = 'none';
  if (submitBtn2) submitBtn2.style.display = 'none';

  const otpInput  = document.getElementById('otpInput');
  const otpStatus = document.getElementById('otpStatus');
  const couponMsg = document.getElementById('couponMsg');
  const couponInput = document.getElementById('couponInput');

  if (otpInput)    otpInput.value          = '';
  if (otpStatus)   otpStatus.textContent   = '';
  if (couponMsg)   couponMsg.textContent   = '';
  if (couponInput) couponInput.value       = '';
  document.getElementById('custPhone').readOnly = false;
  document.getElementById('custName').value     = '';
  document.getElementById('custPhone').value    = '';
  document.getElementById('custAddress').value  = '';
  if (sendBtn)  { sendBtn.disabled = false;  sendBtn.innerHTML  = '<i class="fas fa-sms"></i> Send OTP'; }
  if (verifyBtn){ verifyBtn.disabled = false; verifyBtn.innerHTML = '<i class="fas fa-check"></i> Verify'; }

  const banner = document.getElementById('savedProfileBanner');
  if (banner) banner.style.display = 'none';

  const user = getUser();
  if (user) {
    document.getElementById('custName').value    = user.name;
    document.getElementById('custPhone').value   = user.phone;
    document.getElementById('custAddress').value = user.address || '';
    if (addressRow) addressRow.style.display = 'block';
    if (couponRow)  couponRow.style.display  = 'block';
    if (submitBtn2) submitBtn2.style.display = 'block';
    if (sendBtn) { sendBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verified'; sendBtn.disabled = true; }
    document.getElementById('custPhone').readOnly = true;
    if (banner) {
      document.getElementById('spbName').textContent  = '👤 ' + user.name;
      document.getElementById('spbPhone').textContent = '📞 ' + user.phone;
      banner.style.display = 'flex';
    }
  } else if (!hasOtp) {
    if (addressRow) addressRow.style.display = 'block';
    if (couponRow)  couponRow.style.display  = 'block';
    if (submitBtn2) submitBtn2.style.display = 'block';
  }

  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// ── COUPON ───────────────────────────────────────────────
async function applyCoupon() {
  const code = document.getElementById('couponInput').value.trim().toUpperCase();
  const msg  = document.getElementById('couponMsg');
  if (!code) return;
  try {
    const res  = await fetch(API_URL.replace('/orders', '/orders/coupon/validate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (data.valid) {
      appliedCoupon = data;
      msg.textContent = `✅ ${data.desc} applied!`;
      msg.style.color = '#4caf50';
      updateCartTotalWithDiscount();
    } else {
      appliedCoupon = null;
      msg.textContent = '❌ ' + (data.error || 'Invalid code');
      msg.style.color = '#ff4444';
    }
  } catch {
    msg.textContent = '❌ Could not validate';
    msg.style.color = '#ff4444';
  }
}

function getDiscountedTotal() {
  const raw = getCartTotal();
  if (!appliedCoupon) return raw;
  if (appliedCoupon.type === 'percent') return Math.max(0, raw - Math.round(raw * appliedCoupon.discount / 100));
  return Math.max(0, raw - appliedCoupon.discount);
}

function updateCartTotalWithDiscount() {
  const el = document.getElementById('orderSummary');
  if (!el || !appliedCoupon) return;
  const raw         = getCartTotal();
  const discounted = getDiscountedTotal();
  const existing   = el.querySelector('.summary-discount');
  if (existing) existing.remove();
  el.insertAdjacentHTML('beforeend',
    `<div class="summary-discount summary-item" style="color:#4caf50">
      <span>Discount (${appliedCoupon.desc})</span><span>-₹${raw - discounted}</span>
    </div>
    <div class="summary-item" style="font-weight:700">
      <span>Payable</span><span>₹${discounted}</span>
    </div>`);
}

// ── SUBMIT ORDER ─────────────────────────────────────────
async function submitOrder(e) {
  e.preventDefault();
  const customerName = document.getElementById('custName').value.trim();
  const phoneNumber  = document.getElementById('custPhone').value.trim();
  const address      = document.getElementById('custAddress').value.trim();

  if (!customerName) { showToast('Please enter your name'); return; }
  if (!/^\d{10}$/.test(phoneNumber)) { showToast('Enter a valid 10-digit phone number'); return; }
  if (!address) { showToast('Please enter your delivery address'); return; }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing Order...';

  saveUser(customerName, phoneNumber, address);
  lastOrderItems = [...cart];

  const orderData = {
    customerName, phoneNumber, address,
    itemsOrdered: cart.map(i => ({ name: i.name, price: i.price, quantity: i.quantity })),
    totalAmount: getDiscountedTotal(),
    couponCode: appliedCoupon ? appliedCoupon.code : '',
    discount:   appliedCoupon ? (getCartTotal() - getDiscountedTotal()) : 0
  };
  appliedCoupon = null;

  try {
    const res  = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    const data = await res.json();
    if (data.success) {
      closeModal();
      playOrderSound();
      showSuccess(data.orderId, data.prepTime, customerName, phoneNumber, address);
      cart = []; saveCart(); updateCartUI();
      sessionStorage.removeItem('lff_cart');
    } else {
      showToast(data.error || 'Order failed. Try again.');
    }
  } catch {
    closeModal();
    playOrderSound();
    showSuccessFallback(customerName, phoneNumber, address);
    cart = []; saveCart(); updateCartUI();
    sessionStorage.removeItem('lff_cart');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Order';
  }
}

// ── SUCCESS MODAL ────────────────────────────────────────
function showSuccess(orderId, prepTime, name, phone, address) {
  document.getElementById('orderIdDisplay').innerHTML =
    `<i class="fas fa-hashtag"></i> Order ID: <strong>${orderId}</strong>`;
  document.getElementById('prepTimeDisplay').innerHTML =
    `<i class="fas fa-clock"></i> Estimated Time: <strong>${prepTime} minutes</strong>`;
  document.getElementById('successMsg').textContent =
    `Thank you ${name}! Your order has been received.`;
  document.getElementById('waConfirm').href =
    `https://wa.me/${WA_NUMBER}?text=${buildWAMessage(orderId, name, phone, address)}`;
  setTrackStep(0);
  document.getElementById('successOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  startLiveTracker(orderId, prepTime);
}

function showSuccessFallback(name, phone, address) {
  const fallbackId = 'FFC-' + Date.now();
  document.getElementById('orderIdDisplay').innerHTML =
    `<i class="fas fa-hashtag"></i> Order ID: <strong>${fallbackId}</strong>`;
  document.getElementById('prepTimeDisplay').innerHTML =
    `<i class="fas fa-clock"></i> Estimated Time: <strong>10–15 minutes</strong>`;
  document.getElementById('successMsg').textContent =
    `Thank you ${name}! Please confirm your order on WhatsApp.`;
  document.getElementById('waConfirm').href =
    `https://wa.me/${WA_NUMBER}?text=${buildWAMessage(fallbackId, name, phone, address)}`;
  setTrackStep(0);
  document.getElementById('successOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  startLiveTracker(fallbackId, 15);
}

function setTrackStep(step) {
  for (let i = 0; i <= 3; i++) {
    const el = document.getElementById('track' + i);
    if (!el) return;
    el.classList.toggle('active',  i <= step);
    el.classList.toggle('current', i === step);
  }
}

function buildWAMessage(orderId, name, phone, address) {
  const items = lastOrderItems.map(i =>
    `• ${i.name} x${i.quantity} = ₹${i.price * i.quantity}`).join('\n');
  const total = lastOrderItems.reduce((s, i) => s + i.price * i.quantity, 0);
  return encodeURIComponent(
    `Hey Santosh, I ordered:\n\n` +
    `${items}\n\n` +
    `💰 Total: ₹${total}\n` +
    `📍 Address: ${address}\n` +
    `💵 Payment: Cash on Delivery\n\n` +
    `Please prepare the order and send it.\nThankyou! 🙏`
  );
}

function closeSuccess() {
  document.getElementById('successOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// ── GALLERY LIGHTBOX ────────────────────────────────────
const lightbox      = document.getElementById('lightbox');
const lightboxImg    = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');

document.querySelectorAll('.gallery-item').forEach(item => {
  item.addEventListener('click', () => {
    lightboxImg.src = item.querySelector('img').src;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
});

if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
if (lightbox) lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLightbox(); closeModal(); closeSuccess(); closeMyOrders(); }
});

function closeLightbox() {
  if (lightbox) lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

// ── SCROLL ANIMATIONS ───────────────────────────────────
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('aos-animate');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('[data-aos]').forEach(el => observer.observe(el));

// ── SCROLL INDICATOR ────────────────────────────────────
const scrollIndicator = document.querySelector('.scroll-indicator');
window.addEventListener('scroll', () => {
  if (scrollIndicator) scrollIndicator.style.opacity = window.scrollY > 100 ? '0' : '1';
});

// ── ACTIVE NAV LINK ─────────────────────────────────────
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY + 100;
  sections.forEach(sec => {
    const link = document.querySelector(`.nav-links a[href="#${sec.getAttribute('id')}"]`);
    if (link) link.classList.toggle('active-link',
      scrollY >= sec.offsetTop && scrollY < sec.offsetTop + sec.offsetHeight);
  });
});

// ── CTA PARTICLES ───────────────────────────────────────
const ctaParticles = document.getElementById('ctaParticles');
if (ctaParticles) {
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    p.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;
      width:${4+Math.random()*8}px;height:${4+Math.random()*8}px;
      animation-delay:${Math.random()*4}s;animation-duration:${3+Math.random()*4}s;`;
    ctaParticles.appendChild(p);
  }
}

// ── MY ORDERS ───────────────────────────────────────────
function openMyOrders() {
  document.getElementById('myOrdersOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  document.getElementById('myOrdersList').innerHTML = '';
  const saved = getUser();
  if (saved) {
    document.getElementById('myOrdersPhone').value = saved.phone;
    fetchMyOrders();
  }
}

function closeMyOrders() {
  document.getElementById('myOrdersOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

async function fetchMyOrders() {
  const phone = document.getElementById('myOrdersPhone').value.trim();
  if (phone.length !== 10) { showToast('Enter a valid 10-digit number'); return; }
  const btn  = document.getElementById('myOrdersBtn');
  const list = document.getElementById('myOrdersList');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled  = true;
  try {
    const res  = await fetch(BACKEND + '/api/orders/by-phone/' + phone);
    const data = await res.json();
    localStorage.setItem('lff_phone', phone);
    list.innerHTML = data.length
      ? data.map(o => renderMyOrderCard(o)).join('')
      : `<div class="my-orders-empty">
          <div style="font-size:48px;margin-bottom:12px">🍽️</div>
          <p style="font-size:15px;font-weight:600;margin-bottom:6px">No orders yet!</p>
          <p style="font-size:13px;opacity:0.6;margin-bottom:20px">Looks like you haven't ordered anything yet.</p>
          <button class="btn btn-primary" onclick="closeMyOrders();document.getElementById('menu').scrollIntoView({behavior:'smooth'})">
            <i class="fas fa-utensils"></i> Order Now
          </button>
        </div>`;
  } catch {
    list.innerHTML = `<div class="my-orders-empty"><i class="fas fa-wifi"></i><p>Could not connect. Check your internet.</p></div>`;
  } finally {
    btn.innerHTML = '<i class="fas fa-search"></i>';
    btn.disabled  = false;
  }
}

function renderMyOrderCard(o) {
  const steps      = ['Order Received', 'Preparing', 'Ready', 'Completed'];
  const step       = steps.indexOf(o.orderStatus);
  const stepIcons  = ['fa-check-circle', 'fa-fire', 'fa-bell', 'fa-flag-checkered'];
  const stepLabels = ['Received', 'Preparing', 'Ready', 'Done'];
  const statusColor = { 'Order Received': '#ffc107', 'Preparing': '#2196f3', 'Ready': '#9c27b0', 'Completed': '#4caf50' };
  const date    = new Date(o.orderTime);
  const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return `
    <div class="my-order-card">
      <div class="my-order-card-header">
        <span class="my-order-id">🆔 ${o.orderId || o._id.slice(-8).toUpperCase()}</span>
        <span class="status-badge status-${o.orderStatus.replace(' ', '-')}" style="border:1px solid ${statusColor[o.orderStatus]}40">${o.orderStatus}</span>
      </div>
      <div style="font-size:11px;opacity:0.45;margin-bottom:8px">📅 ${dateStr} &nbsp;🕒 ${timeStr}</div>
      <div class="my-order-items">
        ${o.itemsOrdered.map(i => `• ${i.name} x${i.quantity} — ₹${i.price * i.quantity}`).join('<br>')}
      </div>
      <div class="my-order-footer">
        <span class="my-order-total">Total: ₹${o.totalAmount}</span>
        <div class="my-order-track">
          ${steps.map((s, i) => `
            <div class="mot-step ${i <= step ? 'active' : ''} ${i === step ? 'current' : ''}">
              <i class="fas ${stepIcons[i]}"></i>
              <span>${stepLabels[i]}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

// ── LIVE ORDER TRACKER ──────────────────────────────────
let trackerInterval = null;
let trackerOrderId  = null;
const STATUS_STEPS  = ['Order Received', 'Preparing', 'Ready', 'Completed'];

function startLiveTracker(orderId, prepTime) {
  trackerOrderId = orderId;
  document.getElementById('trackerOrderId').textContent = 'Order ID: ' + orderId;
  document.getElementById('trackerEta').textContent     = '⏳ Est. ready in ' + prepTime + ' min';
  updateTrackerUI('Order Received');
  document.getElementById('liveTracker').classList.add('show');
  clearInterval(trackerInterval);
  trackerInterval = setInterval(async () => {
    try {
      const res  = await fetch(API_URL + '/' + orderId);
      const data = await res.json();
      if (data.orderStatus) {
        updateTrackerUI(data.orderStatus);
        document.getElementById('trackerEta').textContent =
          data.orderStatus === 'Ready'     ? '✅ Your order is READY!'  :
          data.orderStatus === 'Completed' ? '🎉 Order Completed!'      :
          '⏳ Est. ready in ' + (data.prepTime || prepTime) + ' min';
        if (data.orderStatus === 'Completed') clearInterval(trackerInterval);
      }
    } catch {}
  }, 15000);
}

function updateTrackerUI(status) {
  const step = STATUS_STEPS.indexOf(status);
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById('ts' + i);
    if (!el) return;
    el.classList.toggle('active',  i <= step);
    el.classList.toggle('current', i === step);
  }
}

function closeTracker() {
  document.getElementById('liveTracker').classList.remove('show');
  clearInterval(trackerInterval);
}

// ── LANGUAGE TOGGLE (Translations Omitted for Brevity - Keeping Structure) ──
let isHindi = false;
// ... (Your translations object stays the same as before) ...

function toggleLanguage() {
  isHindi = !isHindi;
  const lang = isHindi ? 'hi' : 'en';
  localStorage.setItem('lff_lang', lang);
  applyLanguage(lang);
}

function applyLanguage(lang) {
  // ... (Your existing applyLanguage logic) ...
}

// ── INIT ─────────────────────────────────────────────────
updateCartUI();
updateShopStatus();
updateUserLogoutBtn();
(function() {
  const saved = localStorage.getItem('lff_lang');
  if (saved === 'hi') { isHindi = true; applyLanguage('hi'); }
})();