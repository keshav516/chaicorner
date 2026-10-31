const sampleMenu = [
  { id: 1, name: 'Masala Chai', category: 'tea', price: 25, description: 'Classic Indian spiced tea brewed with fresh ginger, cardamom, and cloves.' },
  { id: 2, name: 'Ginger Tea (Adrak Chai)', category: 'tea', price: 20, description: 'Soothing tea infused with crushed fresh ginger root.' },
  { id: 3, name: 'Green Tea', category: 'tea', price: 30, description: 'Light and refreshing antioxidant-rich green tea.' },
  { id: 4, name: 'Elaichi Chai', category: 'tea', price: 25, description: 'Fragrant cardamom tea boiled to perfection with milk.' },
  { id: 5, name: 'Bun Maska', category: 'snack', price: 35, description: 'Soft sweet bun generously layered with fresh churned butter.' },
  { id: 6, name: 'Crispy Samosa', category: 'snack', price: 20, description: 'Golden fried pastry filled with spiced potatoes and peas.' },
  { id: 7, name: 'Osmania Biscuits', category: 'snack', price: 15, description: 'Traditional buttery, slightly salty tea-time biscuits (4 pcs).' }
];

let cart = [];
let currentCategory = 'all';
let isSignUp = false;
let userSession = null;

try {
  const saved = localStorage.getItem('chai_session');
  if (saved) userSession = JSON.parse(saved);
} catch(e){}

const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || '';

document.addEventListener('DOMContentLoaded', () => {
  initAuthNav();
  renderMenu(sampleMenu);
  setupEventListeners();
  if(userSession) {
    loadOrders();
  }
});

function setupEventListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.dataset.category;
      const filtered = currentCategory === 'all' ? sampleMenu : sampleMenu.filter(i => i.category === currentCategory);
      renderMenu(filtered);
    });
  });

  document.getElementById('cart-float').addEventListener('click', toggleCart);
  document.getElementById('close-cart').addEventListener('click', toggleCart);
  document.getElementById('checkout-btn').addEventListener('click', placeOrder);
  
  document.getElementById('close-auth').addEventListener('click', () => toggleAuthModal(false));
  document.getElementById('auth-switch-btn').addEventListener('click', toggleAuthMode);
  document.getElementById('auth-form').addEventListener('submit', handleAuth);
}

function renderMenu(items) {
  const grid = document.getElementById('menu-grid');
  grid.innerHTML = items.map(item => `
    <div class="card">
      <div class="card-body">
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <div class="card-footer">
          <span class="price">₹${item.price}</span>
          <button class="btn btn-outline" onclick="addToCart(${item.id})">Add</button>
        </div>
      </div>
    </div>
  `).join('');
}

window.addToCart = function(id) {
  const item = sampleMenu.find(i => i.id === id);
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  updateCartUI();
}

function updateCartUI() {
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  document.getElementById('cart-count').innerText = count;
  document.getElementById('cart-float').style.display = count > 0 ? 'block' : 'none';

  const itemsEl = document.getElementById('cart-items');
  itemsEl.innerHTML = cart.map(i => `
    <div class="cart-item">
      <div>
        <h4>${i.name}</h4>
        <span>₹${i.price} × ${i.qty}</span>
      </div>
      <button class="btn btn-outline" style="padding:4px 10px;" onclick="removeFromCart(${i.id})">Remove</button>
    </div>
  `).join('');

  const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  document.getElementById('cart-total').innerText = `₹${total}`;
}

window.removeFromCart = function(id) {
  cart = cart.filter(i => i.id !== id);
  updateCartUI();
  if (cart.length === 0) toggleCart();
}

function toggleCart() {
  document.getElementById('cart-section').classList.toggle('open');
}

function initAuthNav() {
  const nav = document.getElementById('auth-nav');
  const ordersNav = document.getElementById('nav-orders');
  const ordersSec = document.getElementById('orders');

  if (userSession) {
    nav.innerHTML = `<button class="btn btn-outline" onclick="logout()">Logout</button>`;
    ordersNav.style.display = 'inline';
    ordersSec.style.display = 'block';
  } else {
    nav.innerHTML = `<button class="btn btn-primary" onclick="toggleAuthModal(true)">Login</button>`;
    ordersNav.style.display = 'none';
    ordersSec.style.display = 'none';
  }
}

window.toggleAuthModal = function(show) {
  document.getElementById('auth-modal').classList.toggle('open', show);
  document.getElementById('auth-error').innerText = '';
}

function toggleAuthMode() {
  isSignUp = !isSignUp;
  document.getElementById('auth-title').innerText = isSignUp ? 'Customer Sign Up' : 'Customer Login';
  document.getElementById('auth-submit').innerText = isSignUp ? 'Sign Up' : 'Login';
  document.getElementById('auth-toggle-text').innerText = isSignUp ? 'Already have an account?' : 'New to Chai Corner?';
  document.getElementById('auth-switch-btn').innerText = isSignUp ? 'Login' : 'Sign Up';
}

async function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  const errEl = document.getElementById('auth-error');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    errEl.innerText = 'Please configure config.js with your Supabase credentials first.';
    return;
  }

  const endpoint = isSignUp ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password';
  try {
    const res = await fetch(SUPABASE_URL + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || 'Authentication failed');
    
    userSession = isSignUp ? data : data;
    try { localStorage.setItem('chai_session', JSON.stringify(userSession)); } catch(e){}
    toggleAuthModal(false);
    initAuthNav();
    loadOrders();
  } catch (err) {
    errEl.innerText = err.message;
  }
}

window.logout = function() {
  userSession = null;
  try { localStorage.removeItem('chai_session'); } catch(e){}
  initAuthNav();
  cart = [];
  updateCartUI();
  document.getElementById('cart-section').classList.remove('open');
}

async function placeOrder() {
  if (!userSession) {
    toggleAuthModal(true);
    return;
  }
  if (cart.length === 0) return;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    alert('Supabase credentials not configured in config.js');
    return;
  }

  const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const token = userSession.access_token;

  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + token,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ items: cart, total_amount: total, status: 'Preparing' })
    });

    if (!res.ok) throw new Error('Failed to place order');

    cart = [];
    updateCartUI();
    toggleCart();
    alert('Order placed successfully! Garma garam chai is on the way.');
    loadOrders();
  } catch (err) {
    alert(err.message);
  }
}

async function loadOrders() {
  if (!userSession || !SUPABASE_URL) return;
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/orders?select=*&order=created_at.desc', {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + userSession.access_token
      }
    });
    if (!res.ok) throw new Error('Could not load orders');
    const orders = await res.json();
    const list = document.getElementById('orders-list');
    list.innerHTML = orders.length === 0 ? '<p>No orders yet.</p>' : orders.map(o => `
      <div class="card" style="margin-bottom:15px;">
        <div class="card-body">
          <h4>Order #${o.id.slice(0,8)} - <span style="color:var(--primary)">${o.status}</span></h4>
          <p style="margin:5px 0;">Total: ₹${o.total_amount} | Date: ${new Date(o.created_at).toLocaleString()}</p>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}