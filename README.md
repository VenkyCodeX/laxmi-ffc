# 🔥 Laxmi Fast Food – Full Stack Website

## Project Structure
```
Laxmi_FFC/
├── index.html              ← Frontend homepage
├── menu.html               ← Full menu page with filter
├── track.html              ← Customer order tracking page
├── profile.html            ← Customer profile page
├── css/
│   ├── styles.css          ← All global styles
│   └── menu.css            ← Menu page styles
├── js/script.js            ← Frontend logic (cart, order, OTP, coupon, language)
├── assets/
│   ├── Logo.png
│   ├── boss_pic1.webp      ← Owner photo 1 (About Us slider)
│   ├── boss_pic2.webp      ← Owner photo 2 (About Us slider)
│   └── Video Project.mp4  ← Hero background video
└── backend/
    ├── server.js           ← Express server
    ├── .env                ← Environment variables
    ├── models/Order.js     ← MongoDB schema (rating, review, coupon, discount)
    ├── routes/orders.js    ← API routes
    └── admin/
        ├── index.html      ← Admin dashboard
        └── reviews.html    ← Standalone reviews page
```

---

## ⚙️ Backend Setup (Local)

```bash
cd backend
npm install
# Edit .env with your MongoDB Atlas URI
npm start
```

---

## 🌐 Deploy Backend on Render

1. Push the `backend/` folder to a GitHub repo
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo
4. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Add Environment Variables:
   - `MONGO_URI` = your MongoDB Atlas connection string
   - `PORT` = 5000
6. Copy the deployed URL (e.g. `https://laxmi-ffc-backend.onrender.com`)

---

## 🗄️ MongoDB Atlas Setup

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) → Create free cluster
2. Create a database user with password
3. Whitelist IP: `0.0.0.0/0` (allow all)
4. Get connection string → paste into `.env` as `MONGO_URI`

---

## 🔗 Connect Frontend to Backend

In `js/script.js` line 2, the backend URL is auto-detected:
```js
const BACKEND = 'http://localhost:5000'; // local
// For production update to your Render URL
```

---

## 🚀 Deploy Frontend on GitHub Pages

1. Push the root folder (everything except `backend/`) to GitHub
2. Go to repo Settings → Pages → Source: `main` branch → `/root`
3. Your site will be live at `https://yourusername.github.io/repo-name`

---

## 🔐 Admin Dashboard

Visit: `https://your-backend.onrender.com/admin`

Default password: `laxmi@admin123`
> Change this in `backend/.env` → `ADMIN_PASSWORD` and update `backend/admin/index.html` line with `const ADMIN_PASS`

### Admin Pages
- `/admin` → Main dashboard (orders, stats, revenue chart, reviews)
- `/admin/reviews.html` → Standalone reviews page (date filter, star filter, grouped by date)

---

## 🛠️ Quick Change Guide

| What to change | Where |
|---|---|
| Menu items & prices | `menu.html` |
| WhatsApp number | `js/script.js` line 5 → `WA_NUMBER` |
| Coupon codes | `backend/routes/orders.js` → `COUPONS` object |
| Admin password | `backend/.env` → `ADMIN_PASSWORD` + `backend/admin/index.html` → `ADMIN_PASS` |
| Owner photos | Replace `assets/boss_pic1.webp` / `boss_pic2.webp` |
| Shop open/close hours | `js/script.js` → `SHOP_OPEN` / `SHOP_CLOSE` |
| Shop opening date (for duration calc) | `index.html` bottom script → `new Date(2024, 10, 1)` |

---

## 📱 Features

- ✅ Full responsive mobile-first design
- ✅ Bottom navigation bar for mobile
- ✅ Cart system with quantity controls (clears on page refresh & after order)
- ✅ OTP phone verification before placing order
- ✅ Order form with name, phone, address + GPS location
- ✅ Orders saved to MongoDB
- ✅ WhatsApp order confirmation with full order details
- ✅ Coupon system (`LAXMI10`, `WELCOME20`, `FLAT50`, `SPICY30`)
- ✅ Admin dashboard with live order management
- ✅ Status updates: Order Received → Preparing → Ready → Completed
- ✅ Date-wise order filtering in admin
- ✅ Monthly revenue chart (Chart.js) with Last 7 Days toggle
- ✅ Export orders as CSV
- ✅ Push notifications for new orders (admin)
- ✅ Customer order tracking page (`track.html`)
- ✅ Star ratings & reviews after order completed
- ✅ Admin reviews page with date/star filters
- ✅ Auto-refresh every 30 seconds in admin
- ✅ Gallery lightbox
- ✅ Scroll animations
- ✅ Hindi / English language toggle
- ✅ Owner photo slider in About Us (auto-slides every 5 seconds)
- ✅ Shop duration auto-updates every month (since Nov 2024)
- ✅ Customer profile saved locally
- ✅ Live order tracker widget on homepage
