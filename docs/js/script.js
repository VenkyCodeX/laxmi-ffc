// ── CONFIG ───────────────────────────────────────────────
const BACKEND   = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : 'https://laxmi-ffc-backend.onrender.com';
const API_URL    = BACKEND + '/api/orders';
const OTP_URL    = BACKEND + '/api/otp';
const ITEMS_URL  = BACKEND + '/api/items';
const WA_NUMBER  = '9321611315';
const SHOP_OPEN  = 11;
const SHOP_CLOSE = 23;
const MIN_ORDER  = 50;
const DELIVERY_CHARGE = 10;

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
  if (!navbar) return;
  navbar.style.background     = window.scrollY > 50 ? 'rgba(0,0,0,0.95)' : 'transparent';
  navbar.style.backdropFilter = window.scrollY > 50 ? 'blur(12px)' : 'none';
});

// ── HAMBURGER ────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');
if (hamburger) hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(l =>
  l.addEventListener('click', () => { if (navLinks) navLinks.classList.remove('open'); })
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
function getCartGrandTotal() { return getCartTotal() + (getCartTotal() > 0 ? DELIVERY_CHARGE : 0); }
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
  const rawTotal = getCartTotal();
  const belowMin = rawTotal < MIN_ORDER;
  cartTotalEl.textContent = `₹${rawTotal + DELIVERY_CHARGE}`;
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
    </div>`).join('') +
    `<div style="margin-top:10px;padding:10px 0;border-top:1px solid #222;font-size:13px;opacity:0.7">
      <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>₹${rawTotal}</span></div>
      <div style="display:flex;justify-content:space-between;margin-top:4px"><span>🛵 Delivery</span><span>₹${DELIVERY_CHARGE}</span></div>
    </div>` +
    (belowMin ? `<div style="background:#ff2b2b22;border:1px solid #ff2b2b44;border-radius:8px;padding:8px 12px;margin-top:8px;font-size:12px;color:#ff6b6b">⚠️ Minimum order is ₹${MIN_ORDER}. Add ₹${MIN_ORDER - rawTotal} more.</div>` : '');
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

  // Minimum order check
  if (getCartTotal() < MIN_ORDER) {
    showToast(`Minimum order is ₹${MIN_ORDER}. Add ₹${MIN_ORDER - getCartTotal()} more.`);
    return;
  }

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
    <div class="summary-item" style="opacity:0.6"><span>🛵 Delivery</span><span>₹${DELIVERY_CHARGE}</span></div>
    <div class="summary-total"><span>Total</span><span>₹${getCartGrandTotal()}</span></div>`;

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
  const raw        = getCartTotal();
  const discounted = getDiscountedTotal();
  const existing   = el.querySelector('.summary-discount');
  if (existing) existing.remove();
  // remove old payable line too
  el.querySelectorAll('.summary-item[style*="font-weight:700"]').forEach(e => e.remove());
  el.insertAdjacentHTML('beforeend',
    `<div class="summary-discount summary-item" style="color:#4caf50">
      <span>Discount (${appliedCoupon.desc})</span><span>-₹${raw - discounted}</span>
    </div>
    <div class="summary-item" style="font-weight:700">
      <span>Payable (incl. delivery)</span><span>₹${discounted + DELIVERY_CHARGE}</span>
    </div>`);
}

// ── PENDING ORDER DETAILS (set before payment modal opens) ──
let _pendingOrder = null;

// ── SUBMIT ORDER → open payment modal ────────────────────
function submitOrder() {
  const customerName = document.getElementById('custName').value.trim();
  const phoneNumber  = document.getElementById('custPhone').value.trim();
  const address      = document.getElementById('custAddress').value.trim();

  if (!customerName) { showToast('Please enter your name'); return; }
  if (!/^\d{10}$/.test(phoneNumber)) { showToast('Enter a valid 10-digit phone number'); return; }
  if (!address) { showToast('Please enter your delivery address'); return; }

  saveUser(customerName, phoneNumber, address);
  lastOrderItems = [...cart];

  _pendingOrder = {
    customerName, phoneNumber, address,
    totalAmount: getDiscountedTotal() + DELIVERY_CHARGE,
    couponCode: appliedCoupon ? appliedCoupon.code : '',
    discount:   appliedCoupon ? (getCartTotal() - getDiscountedTotal()) : 0,
    items: cart.map(i => ({ name: i.name, price: i.price, quantity: i.quantity }))
  };
  appliedCoupon = null;

  // close order form, open payment modal
  closeModal();
  setTimeout(openPaymentModal, 320);
}

// ── PAYMENT MODAL ─────────────────────────────────────────
function openPaymentModal() {
  document.getElementById('paymentOrderAmt').textContent = '₹' + _pendingOrder.totalAmount;
  document.getElementById('paymentProcessing').style.display = 'none';
  document.querySelectorAll('.pay-option').forEach(el => el.style.opacity = '1');
  document.getElementById('paymentOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePaymentModal() {
  document.getElementById('paymentOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

async function selectPayment(method) {
  if (method === 'cod') {
    closePaymentModal();
    await placeOrder('cod', '');
  } else {
    // method = 'phonepe' | 'googlepay' | 'paytm'
    await handleRazorpayPayment(method);
  }
}

// ── RAZORPAY UPI PAYMENT ──────────────────────────────────
const UPI_APP_CONFIG = {
  phonepe:   { vpa: 'phonepe',   wallet: null },
  googlepay: { vpa: 'gpay',      wallet: null },
  paytm:     { vpa: 'paytm',     wallet: 'paytm' }
};

async function handleRazorpayPayment(upiApp) {
  // show processing spinner
  document.querySelectorAll('.pay-option').forEach(el => el.style.opacity = '0.4');
  document.getElementById('paymentProcessing').style.display = 'block';

  try {
    const res  = await fetch(API_URL + '/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: _pendingOrder.totalAmount })
    });
    const data = await res.json();
    if (!data.success) {
      showToast('Payment initiation failed. Try COD.');
      document.querySelectorAll('.pay-option').forEach(el => el.style.opacity = '1');
      document.getElementById('paymentProcessing').style.display = 'none';
      return;
    }

    const cfg = UPI_APP_CONFIG[upiApp];
    const options = {
      key: 'rzp_test_XXXXXXXXXXXXXXXX', // ← replace with your Razorpay Key ID
      amount: data.amount,
      currency: data.currency,
      name: 'Laxmi Fast Food',
      description: 'Food Order',
      order_id: data.orderId,
      prefill: {
        name:    _pendingOrder.customerName,
        contact: _pendingOrder.phoneNumber,
        method:  'upi'
      },
      method: { upi: true, card: false, netbanking: false, wallet: false },
      config: { display: { blocks: { upi: { name: 'Pay via UPI', instruments: [{ method: 'upi', apps: [upiApp === 'googlepay' ? 'google_pay' : upiApp === 'phonepe' ? 'phonepe' : 'paytm'] }] } }, sequence: ['block.upi'], preferences: { show_default_blocks: false } } },
      theme: { color: '#ff2b2b' },
      handler: async function(response) {
        closePaymentModal();
        // verify
        try {
          const vRes  = await fetch(API_URL + '/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature
            })
          });
          const vData = await vRes.json();
          if (vData.success) {
            await placeOrder('upi', response.razorpay_payment_id);
          } else {
            showToast('Payment verification failed. Contact support.');
          }
        } catch {
          showToast('Could not verify payment. Contact support.');
        }
      },
      modal: { ondismiss: function() {
        document.querySelectorAll('.pay-option').forEach(el => el.style.opacity = '1');
        document.getElementById('paymentProcessing').style.display = 'none';
      }}
    };
    const rzp = new Razorpay(options);
    rzp.open();
  } catch {
    showToast('Payment failed. Please try COD.');
    document.querySelectorAll('.pay-option').forEach(el => el.style.opacity = '1');
    document.getElementById('paymentProcessing').style.display = 'none';
  }
}

// ── PLACE ORDER (after payment decision) ─────────────────
async function placeOrder(paymentMethod, transactionId) {
  const { customerName, phoneNumber, address, totalAmount, couponCode, discount, items } = _pendingOrder;

  const orderData = {
    customerName, phoneNumber, address,
    itemsOrdered: items,
    totalAmount,
    couponCode,
    discount,
    deliveryCharge: DELIVERY_CHARGE,
    paymentMethod,
    transactionId
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res  = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const data = await res.json();
    if (data.success) {
      playOrderSound();
      showSuccess(data.orderId, data.prepTime, customerName, phoneNumber, address, paymentMethod, transactionId);
      cart = []; saveCart(); updateCartUI();
      sessionStorage.removeItem('lff_cart');
    } else {
      showToast(data.error || 'Order failed. Try again.');
    }
  } catch {
    playOrderSound();
    showSuccessFallback(customerName, phoneNumber, address, paymentMethod, transactionId);
    cart = []; saveCart(); updateCartUI();
    sessionStorage.removeItem('lff_cart');
  }
}

// ── SUCCESS MODAL ────────────────────────────────────────
function showSuccess(orderId, prepTime, name, phone, address, paymentMethod = 'cod', transactionId = '') {
  document.getElementById('orderIdDisplay').innerHTML =
    `<i class="fas fa-hashtag"></i> Order ID: <strong>${orderId}</strong>`;
  document.getElementById('prepTimeDisplay').innerHTML =
    `<i class="fas fa-clock"></i> Estimated Time: <strong>${prepTime} minutes</strong>`;
  document.getElementById('successMsg').textContent =
    `Thank you ${name}! Your order has been received.`;
  document.getElementById('waConfirm').href =
    `https://wa.me/${WA_NUMBER}?text=${buildWAMessage(orderId, name, phone, address, paymentMethod, transactionId)}`;
  setTrackStep(0);
  document.getElementById('successOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  startLiveTracker(orderId, prepTime);
}

function showSuccessFallback(name, phone, address, paymentMethod = 'cod', transactionId = '') {
  const fallbackId = 'FFC-' + Date.now();
  document.getElementById('orderIdDisplay').innerHTML =
    `<i class="fas fa-hashtag"></i> Order ID: <strong>${fallbackId}</strong>`;
  document.getElementById('prepTimeDisplay').innerHTML =
    `<i class="fas fa-clock"></i> Estimated Time: <strong>10–15 minutes</strong>`;
  document.getElementById('successMsg').textContent =
    `Thank you ${name}! Please confirm your order on WhatsApp.`;
  document.getElementById('waConfirm').href =
    `https://wa.me/${WA_NUMBER}?text=${buildWAMessage(fallbackId, name, phone, address, paymentMethod, transactionId)}`;
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

function buildWAMessage(orderId, name, phone, address, paymentMethod, transactionId) {
  const items = lastOrderItems.map(i =>
    `• ${i.name} x${i.quantity} = ₹${i.price * i.quantity}`).join('\n');
  const total = lastOrderItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const payLine = paymentMethod === 'upi'
    ? `💳 Payment: Online (UPI/Card) ✅ Paid\nTransaction ID: ${transactionId}`
    : `💵 Payment: Cash on Delivery`;
  return encodeURIComponent(
    `Hey Santosh, I ordered:\n\n` +
    `${items}\n\n` +
    `💰 Total: ₹${total}\n` +
    `📍 Address: ${address}\n` +
    `${payLine}\n\n` +
    `Please prepare the order and send it.\nThankyou! 🙏`
  );
}

function closeSuccess() {
  document.getElementById('successOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// ── GALLERY LIGHTBOX ────────────────────────────────────
const lightbox     = document.getElementById('lightbox');
const lightboxImg  = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');

document.querySelectorAll('.gallery-item').forEach(item => {
  item.addEventListener('click', () => {
    if (!lightboxImg || !lightbox) return;
    lightboxImg.src = item.querySelector('img').src;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
});

if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
if (lightbox) lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLightbox(); closeModal(); closeSuccess(); closeMyOrders(); closePaymentModal(); }
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res  = await fetch(BACKEND + '/api/orders/by-phone/' + phone, { signal: controller.signal });
    clearTimeout(timeout);
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
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    list.innerHTML = `<div class="my-orders-empty"><i class="fas fa-${isTimeout ? 'hourglass-half' : 'wifi'}"></i><p>${isTimeout ? 'Server waking up... Retry in 30s' : 'Could not connect. Check your internet.'}</p><button class="btn btn-primary" style="margin-top:12px" onclick="fetchMyOrders()"><i class="fas fa-sync-alt"></i> Retry</button></div>`;
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

  // Show delivery confirm button after prepTime + 5 min
  const confirmDelay = (prepTime + 5) * 60 * 1000;
  setTimeout(() => showTrackerDeliveryConfirm(orderId, prepTime), confirmDelay);

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
        if (data.orderStatus === 'Completed') {
          clearInterval(trackerInterval);
          showTrackerDeliveryConfirm(orderId, prepTime);
        }
      }
    } catch {}
  }, 15000);
}

function showTrackerDeliveryConfirm(orderId, prepTime) {
  const tracker = document.getElementById('liveTracker');
  if (!tracker || tracker.querySelector('.tracker-dc')) return;
  const waMsg = encodeURIComponent(
    `Hey Santosh, kindly look at this issue. The estimated time is up and we didn't receive the order yet.\n\nOrder ID: ${orderId}\nEst. Time: ${prepTime} min`
  );
  tracker.insertAdjacentHTML('beforeend', `
    <div class="tracker-dc" id="trackerDC">
      <p>⏰ Time's up — Did you receive your order?</p>
      <div class="tracker-dc-btns">
        <button class="tdc-yes" onclick="handleTrackerDC('yes','${orderId}')"><i class="fas fa-check"></i> Yes!</button>
        <button class="tdc-no"  onclick="handleTrackerDC('no','${orderId}','${waMsg}')"><i class="fas fa-times"></i> Not Yet</button>
      </div>
    </div>`);
}

function handleTrackerDC(answer, orderId, waMsg) {
  const box = document.getElementById('trackerDC');
  if (!box) return;
  fetch(API_URL + '/' + orderId + '/delivery-confirm', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmed: answer })
  }).catch(() => {});
  if (answer === 'yes') {
    box.innerHTML = `<p style="color:#4caf50;font-size:13px;text-align:center">✅ Glad you received it! Enjoy your meal 🍽️</p>`;
  } else {
    box.innerHTML = `
      <p style="color:#ff4444;font-size:12px;text-align:center;margin-bottom:8px">⚠️ We're sorry! Please chat with us.</p>
      <a href="https://wa.me/${WA_NUMBER}?text=${waMsg}" target="_blank"
        style="display:flex;align-items:center;justify-content:center;gap:6px;background:#25d366;color:#fff;padding:10px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none">
        <i class="fab fa-whatsapp"></i> Chat with Us
      </a>`;
  }
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

// ── LANGUAGE TOGGLE ─────────────────────────────────────
let isHindi = false;

const translations = {
  en: {
    navHome: 'Home', navMenu: 'Menu', navGallery: 'Gallery', navAbout: 'About', navContact: 'Contact',
    myOrders: 'My Orders',
    heroBadge: '🌶️ Street Food Since 2010',
    heroTagline: 'Hot & Spicy Street Food in <strong>Shankar Nagar</strong>',
    heroViewMenu: 'View Menu', heroOrderNow: 'Order Now',
    statCustomers: 'Happy Customers', statItems: 'Menu Items', statYears: 'Years of Taste',
    shopHours: '⏰ Open: 11:00 AM – 11:00 PM',
    specialBadge: "🌟 TODAY'S SPECIAL",
    menuTag: 'Our Specialties', menuTitle: 'EXPLORE THE <span>MENU</span>',
    menuSubtitle: 'Fresh, hot, and made with love – every single time',
    filterAll: 'All', filterNoodles: '🍜 Noodles', filterRice: '🍚 Fried Rice', filterStarters: '🍗 Starters', filterDrinks: '🥤 Drinks',
    popularTag: 'Most Loved', popularTitle: 'POPULAR <span>DISHES</span>',
    reviewsTag: 'What People Say', reviewsTitle: 'CUSTOMER <span>REVIEWS</span>',
    galleryTag: 'Visual Feast', galleryTitle: 'FOOD <span>GALLERY</span>', gallerySubtitle: 'A glimpse into our kitchen and delicious creations',
    aboutTag: 'Our Story', aboutTitle: 'ABOUT <span>US</span>',
    aboutLead: 'Born on the streets of Shankar Nagar, Laxmi Fast Food has been serving bold, fiery, and unforgettable flavors since 2010.',
    aboutDesc: 'Founded by <strong>Dandalwar Santosh Bhimrao</strong>, our stall started as a small setup and grew into a beloved local landmark. Every dish is cooked fresh to order with hand-picked spices and a whole lot of passion.',
    aboutF1: 'Freshly cooked every order', aboutF2: 'Quality ingredients only', aboutF3: 'Made with love & spice', aboutF4: '500+ happy customers daily',
    aboutBadge: '🏆 6+ Months',
    ctaTitle: 'HUNGRY? <span>ORDER NOW!</span>', ctaSubtitle: 'Add items to your cart and place your order in seconds', ctaBrowse: 'Browse Menu',
    contactTag: 'Find Us', contactTitle: 'GET IN <span>TOUCH</span>',
    contactLoc: 'Location', contactPhone: 'Phone', contactHours: 'Hours', contactWA: 'WhatsApp',
    contactLocVal: 'Shankar Nagar, Raipur,<br/>Chhattisgarh – 492007',
    contactHoursVal: 'Mon – Sun<br/>11:00 AM – 11:00 PM',
    contactWAVal: 'Chat to Order',
    footerTagline: 'Hot & Spicy Street Food in Shankar Nagar',
    footerCopy: '© 2024 Laxmi Fast Food. All rights reserved.',
    cartHeader: 'Your Order', cartEmpty: 'Your cart is empty', cartEmptySub: 'Add items from the menu',
    cartTotal: 'Total', placeOrder: 'Place Order',
    orderModalTitle: 'Complete Your Order',
    labelName: 'Your Name', labelPhone: 'Phone Number', labelAddress: 'Delivery Address',
    placeName: 'Enter your full name', placePhone: '10-digit mobile number', placeAddress: 'Enter your full delivery address',
    useLocation: 'Use Location', confirmOrder: 'Confirm Order',
    myOrdersTitle: 'My Orders Today', myOrdersLabel: 'Enter your phone number',
    successTitle: 'Order Placed!', continueBrowsing: 'Continue Browsing', waConfirmBtn: 'Confirm on WhatsApp',
    langBtn: '🌐 हिंदी'
  },
  hi: {
    navHome: 'होम', navMenu: 'मेनू', navGallery: 'गैलरी', navAbout: 'हमारे बारे में', navContact: 'संपर्क',
    myOrders: 'मेरे ऑर्डर',
    heroBadge: '🌶️ 2010 से स्ट्रीट फूड',
    heroTagline: 'शंकर नगर में <strong>गरम और मसालेदार</strong> स्ट्रीट फूड',
    heroViewMenu: 'मेनू देखें', heroOrderNow: 'अभी ऑर्डर करें',
    statCustomers: 'खुश ग्राहक', statItems: 'मेनू आइटम', statYears: 'साल का स्वाद',
    shopHours: '⏰ खुला: सुबह 11 – रात 11',
    specialBadge: '🌟 आज का स्पेशल',
    menuTag: 'हमारी विशेषताएं', menuTitle: 'मेनू <span>देखें</span>',
    menuSubtitle: 'ताज़ा, गरम और प्यार से बना – हर बार',
    filterAll: 'सभी', filterNoodles: '🍜 नूडल्स', filterRice: '🍚 फ्राइड राइस', filterStarters: '🍗 स्टार्टर', filterDrinks: '🥤 ड्रिंक्स',
    popularTag: 'सबसे पसंदीदा', popularTitle: 'लोकप्रिय <span>व्यंजन</span>',
    reviewsTag: 'लोग क्या कहते हैं', reviewsTitle: 'ग्राहक <span>समीक्षाएं</span>',
    galleryTag: 'दृश्य दावत', galleryTitle: 'फूड <span>गैलरी</span>', gallerySubtitle: 'हमारी रसोई और स्वादिष्ट व्यंजनों की एक झलक',
    aboutTag: 'हमारी कहानी', aboutTitle: 'हमारे <span>बारे में</span>',
    aboutLead: 'शंकर नगर की गलियों में जन्मी, लक्ष्मी फास्ट फूड 2010 से बोल्ड, तीखे और अविस्मरणीय स्वाद परोस रही है।',
    aboutDesc: '<strong>दंडलवार संतोष भीमराव</strong> द्वारा स्थापित, हमारा स्टॉल एक छोटी गाड़ी से शुरू होकर एक प्रिय स्थानीय पहचान बन गया।',
    aboutF1: 'हर ऑर्डर पर ताज़ा पकाया', aboutF2: 'केवल गुणवत्ता सामग्री', aboutF3: 'प्यार और मसाले से बना', aboutF4: 'रोज़ 500+ खुश ग्राहक',
    aboutBadge: '🏆 6+ महीने',
    ctaTitle: 'भूख लगी? <span>अभी ऑर्डर करें!</span>', ctaSubtitle: 'कार्ट में आइटम जोड़ें और सेकंड में ऑर्डर करें', ctaBrowse: 'मेनू देखें',
    contactTag: 'हमें खोजें', contactTitle: 'संपर्क <span>करें</span>',
    contactLoc: 'स्थान', contactPhone: 'फोन', contactHours: 'समय', contactWA: 'व्हाट्सएप',
    contactLocVal: 'शंकर नगर, रायपुर,<br/>छत्तीसगढ़ – 492007',
    contactHoursVal: 'सोम – रवि<br/>सुबह 11:00 – रात 11:00',
    contactWAVal: 'ऑर्डर के लिए चैट करें',
    footerTagline: 'शंकर नगर में गरम और मसालेदार स्ट्रीट फूड',
    footerCopy: '© 2024 लक्ष्मी फास्ट फूड। सर्वाधिकार सुरक्षित।',
    cartHeader: 'आपका ऑर्डर', cartEmpty: 'कार्ट खाली है', cartEmptySub: 'मेनू से आइटम जोड़ें',
    cartTotal: 'कुल', placeOrder: 'ऑर्डर करें',
    orderModalTitle: 'ऑर्डर पूरा करें',
    labelName: 'आपका नाम', labelPhone: 'फोन नंबर', labelAddress: 'डिलीवरी पता',
    placeName: 'अपना पूरा नाम दर्ज करें', placePhone: '10 अंकों का मोबाइल नंबर', placeAddress: 'अपना पूरा डिलीवरी पता दर्ज करें',
    useLocation: 'लोकेशन', confirmOrder: 'ऑर्डर कन्फर्म करें',
    myOrdersTitle: 'आज के मेरे ऑर्डर', myOrdersLabel: 'अपना फोन नंबर दर्ज करें',
    successTitle: 'ऑर्डर हो गया!', continueBrowsing: 'ब्राउज़ करते रहें', waConfirmBtn: 'व्हाट्सएप पर कन्फर्म करें',
    langBtn: '🌐 English'
  }
};

function toggleLanguage() {
  isHindi = !isHindi;
  const lang = isHindi ? 'hi' : 'en';
  localStorage.setItem('lff_lang', lang);
  applyLanguage(lang);
}

function applyLanguage(lang) {
  const t  = translations[lang];
  const q  = sel => document.querySelector(sel);
  const qa = sel => document.querySelectorAll(sel);

  const navAs = qa('.nav-links a');
  if (navAs[0]) navAs[0].textContent = t.navHome;
  if (navAs[1]) navAs[1].textContent = t.navMenu;
  if (navAs[2]) navAs[2].textContent = t.navGallery;
  if (navAs[3]) navAs[3].textContent = t.navAbout;
  if (navAs[4]) navAs[4].textContent = t.navContact;
  const myOrdersBtn = q('.my-orders-btn');
  if (myOrdersBtn) myOrdersBtn.innerHTML = `<i class="fas fa-receipt"></i> ${t.myOrders}`;
  const langBtn = q('#langToggleBtn .lang-text');
  if (langBtn) langBtn.textContent = ' ' + (lang === 'hi' ? 'English' : 'हिंदी');

  const heroBadge = q('.hero-badge'); if (heroBadge) heroBadge.innerHTML = t.heroBadge;
  const heroTagline = q('.hero-tagline'); if (heroTagline) heroTagline.innerHTML = t.heroTagline;
  const heroBtns = qa('.hero-btns .btn');
  if (heroBtns[0]) heroBtns[0].innerHTML = `<i class="fas fa-utensils"></i> ${t.heroViewMenu}`;
  if (heroBtns[1]) heroBtns[1].innerHTML = `<i class="fas fa-shopping-bag"></i> ${t.heroOrderNow}`;
  const stats = qa('.stat p');
  if (stats[0]) stats[0].textContent = t.statCustomers;
  if (stats[1]) stats[1].textContent = t.statItems;
  if (stats[2]) stats[2].textContent = t.statYears;

  const shopHoursEl = q('.shop-hours'); if (shopHoursEl) shopHoursEl.textContent = t.shopHours;
  const specialBadge = q('.special-badge'); if (specialBadge) specialBadge.textContent = t.specialBadge;

  const menuHeader = q('#menu .section-header');
  if (menuHeader) {
    menuHeader.querySelector('.section-tag').textContent = t.menuTag;
    menuHeader.querySelector('h2').innerHTML = t.menuTitle;
    menuHeader.querySelector('p').textContent = t.menuSubtitle;
  }
  const filterBtns = qa('.filter-btn');
  ['filterAll','filterNoodles','filterRice','filterStarters','filterDrinks'].forEach((k,i) => { if (filterBtns[i]) filterBtns[i].textContent = t[k]; });

  const popHeader = q('.popular-section .section-header');
  if (popHeader) { popHeader.querySelector('.section-tag').textContent = t.popularTag; popHeader.querySelector('h2').innerHTML = t.popularTitle; }

  const galHeader = q('#gallery .section-header');
  if (galHeader) { galHeader.querySelector('.section-tag').textContent = t.galleryTag; galHeader.querySelector('h2').innerHTML = t.galleryTitle; galHeader.querySelector('p').textContent = t.gallerySubtitle; }

  const aboutTag = q('#about .section-tag'); if (aboutTag) aboutTag.textContent = t.aboutTag;
  const aboutH2 = q('.about-text h2'); if (aboutH2) aboutH2.innerHTML = t.aboutTitle;
  const aboutLead = q('.about-lead'); if (aboutLead) aboutLead.textContent = t.aboutLead;
  const aboutP = q('.about-text > p:not(.about-lead)'); if (aboutP) aboutP.innerHTML = t.aboutDesc;
  const aboutLis = qa('.about-features li');
  ['aboutF1','aboutF2','aboutF3','aboutF4'].forEach((k,i) => {
    if (!aboutLis[i]) return;
    const icon = aboutLis[i].querySelector('i');
    aboutLis[i].textContent = t[k];
    if (icon) aboutLis[i].prepend(icon);
  });
  const aboutBadge = q('.about-img-badge'); if (aboutBadge) aboutBadge.textContent = t.aboutBadge;

  const ctaH2 = q('.cta-content h2'); if (ctaH2) ctaH2.innerHTML = t.ctaTitle;
  const ctaP = q('.cta-content p'); if (ctaP) ctaP.textContent = t.ctaSubtitle;
  const ctaBtn = q('.cta-content .btn'); if (ctaBtn) ctaBtn.innerHTML = `<i class="fas fa-utensils"></i> ${t.ctaBrowse}`;

  const contactHeader = q('#contact .section-header');
  if (contactHeader) { contactHeader.querySelector('.section-tag').textContent = t.contactTag; contactHeader.querySelector('h2').innerHTML = t.contactTitle; }
  const cc = qa('.contact-card');
  if (cc[0]) { cc[0].querySelector('h4').textContent = t.contactLoc; cc[0].querySelector('p').innerHTML = t.contactLocVal; }
  if (cc[1]) cc[1].querySelector('h4').textContent = t.contactPhone;
  if (cc[2]) { cc[2].querySelector('h4').textContent = t.contactHours; cc[2].querySelector('p').innerHTML = t.contactHoursVal; }
  if (cc[3]) { cc[3].querySelector('h4').textContent = t.contactWA; cc[3].querySelector('a').textContent = t.contactWAVal; }

  const footerPs = qa('.footer-content > p');
  if (footerPs[0]) footerPs[0].textContent = t.footerTagline;
  const footerCopy = q('.footer-copy'); if (footerCopy) footerCopy.textContent = t.footerCopy;
  const footerLinks = qa('.footer-links a');
  if (footerLinks[0]) footerLinks[0].textContent = t.navHome;
  if (footerLinks[1]) footerLinks[1].textContent = t.navMenu;
  if (footerLinks[2]) footerLinks[2].textContent = t.navGallery;
  if (footerLinks[3]) footerLinks[3].textContent = t.navAbout;
  if (footerLinks[4]) footerLinks[4].textContent = t.navContact;

  const cartH3 = q('.cart-header h3'); if (cartH3) cartH3.innerHTML = `<i class="fas fa-shopping-bag"></i> ${t.cartHeader}`;
  const cartTotalSpan = q('.cart-total span:first-child'); if (cartTotalSpan) cartTotalSpan.textContent = t.cartTotal;
  const placeOrderBtn = q('.cart-footer .btn-primary'); if (placeOrderBtn) placeOrderBtn.innerHTML = `<i class="fas fa-paper-plane"></i> ${t.placeOrder}`;

  const modalH3 = q('#orderModal .modal-header h3'); if (modalH3) modalH3.innerHTML = `<i class="fas fa-receipt"></i> ${t.orderModalTitle}`;
  const custName = q('#custName'); if (custName) custName.placeholder = t.placeName;
  const custPhone = q('#custPhone'); if (custPhone) custPhone.placeholder = t.placePhone;
  const custAddress = q('#custAddress'); if (custAddress) custAddress.placeholder = t.placeAddress;
  const locBtn = q('.loc-btn'); if (locBtn) locBtn.innerHTML = `<i class="fas fa-crosshairs"></i> ${t.useLocation}`;
  const confirmBtn = q('#submitBtn'); if (confirmBtn) confirmBtn.innerHTML = `<i class="fas fa-check-circle"></i> ${t.confirmOrder}`;

  const myOrdersH3 = q('#myOrdersModal .modal-header h3'); if (myOrdersH3) myOrdersH3.innerHTML = `<i class="fas fa-receipt"></i> ${t.myOrdersTitle}`;
  const successH3 = q('.success-modal h3'); if (successH3) successH3.textContent = t.successTitle;
  const contBtn = q('.success-btns .btn-primary'); if (contBtn) contBtn.textContent = t.continueBrowsing;
  const waBtn = q('#waConfirm'); if (waBtn) waBtn.innerHTML = `<i class="fab fa-whatsapp"></i> ${t.waConfirmBtn}`;
}

// ── SOLD OUT ITEMS ───────────────────────────────────────
let soldOutItems = new Set();

async function loadSoldOutItems() {
  try {
    const res  = await fetch(ITEMS_URL);
    const data = await res.json();
    soldOutItems = new Set(data.filter(i => i.soldOut).map(i => i.name.toLowerCase()));
    applySoldOutUI();
  } catch {}
}

function applySoldOutUI() {
  // menu.html cards
  document.querySelectorAll('.mp-card').forEach(card => {
    const name = card.dataset.name;
    const btn  = card.querySelector('.mp-add-btn');
    if (!btn) return;
    const isSoldOut = soldOutItems.has(name);
    btn.disabled = isSoldOut;
    btn.innerHTML = isSoldOut ? '<i class="fas fa-ban"></i>' : '<i class="fas fa-plus"></i>';
    btn.style.background = isSoldOut ? '#444' : '';
    btn.title = isSoldOut ? 'Sold Out' : '';
    let badge = card.querySelector('.sold-out-badge');
    if (isSoldOut && !badge) {
      badge = document.createElement('div');
      badge.className = 'mp-badge sold-out-badge';
      badge.style.cssText = 'background:#444;top:auto;bottom:12px;left:12px';
      badge.textContent = '🚫 Sold Out';
      card.querySelector('.mp-img-wrap').appendChild(badge);
    } else if (!isSoldOut && badge) {
      badge.remove();
    }
  });
  // index.html popular cards
  document.querySelectorAll('.popular-card').forEach(card => {
    const h4 = card.querySelector('h4');
    if (!h4) return;
    const name = h4.textContent.toLowerCase();
    if (soldOutItems.has(name)) {
      card.style.opacity = '0.5';
      card.style.pointerEvents = 'none';
      card.title = 'Sold Out';
    } else {
      card.style.opacity = '';
      card.style.pointerEvents = '';
      card.title = '';
    }
  });
}

// ── DARK / LIGHT MODE ────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('lff_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('lff_theme', next);
  const btn = document.getElementById('themeToggleBtn');
  if (btn) btn.innerHTML = next === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// ── INIT ─────────────────────────────────────────────────
initTheme();
updateCartUI();
updateShopStatus();
updateUserLogoutBtn();
loadSoldOutItems();
(function() {
  const saved = localStorage.getItem('lff_lang');
  if (saved === 'hi') { isHindi = true; applyLanguage('hi'); }
  // Update theme btn icon
  const btn = document.getElementById('themeToggleBtn');
  const theme = localStorage.getItem('lff_theme') || 'dark';
  if (btn) btn.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
})();