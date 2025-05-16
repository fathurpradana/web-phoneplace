// script.js - Penggabungan seluruh fitur frontend: login, register, produk, keranjang, hubungi kami

const API_BASE = 'http://localhost/phoneplace/api';

const productsContainer = document.getElementById('products');
const searchInput = document.getElementById('search-input');
const pages = document.querySelectorAll('.page');
const navButtons = document.querySelectorAll('.nav-btn');
const cartCountElem = document.getElementById('cart-count');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalElem = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');
const contactForm = document.getElementById('contact-form');
const contactFeedback = document.getElementById('contact-feedback');

const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginBtn = document.getElementById('login-btn');
const toRegisterBtn = document.getElementById('to-register-btn');
const toLoginBtn = document.getElementById('to-login-btn');
const modalCloseBtns = document.querySelectorAll('.modal-close-btn');

let productsData = [];
let cart = {};
let currentUser = null;

// ===========================
// Utility Functions
// ===========================
function formatCurrency(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num);
}

function showPage(pageId) {
  pages.forEach(page => {
    if (page.id === pageId) {
      page.classList.add('active');
      page.setAttribute('tabindex', '0');
      page.focus();
    } else {
      page.classList.remove('active');
      page.removeAttribute('tabindex');
    }
  });
  history.replaceState(null, '', `#${pageId}`);
}

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    if(btn.dataset.target) {
      showPage(btn.dataset.target);
    }
  });
});

function initPageFromHash() {
  const hash = window.location.hash.replace('#', '');
  if(hash && document.getElementById(hash)) {
    showPage(hash);
  } else {
    showPage('home');
  }
}

function saveCurrentUser(user) {
  currentUser = user;
  sessionStorage.setItem('phoneplaceCurrentUser', JSON.stringify(user));
}

function loadCurrentUser() {
  const stored = sessionStorage.getItem('phoneplaceCurrentUser');
  currentUser = stored ? JSON.parse(stored) : null;
}

function clearCurrentUser() {
  currentUser = null;
  sessionStorage.removeItem('phoneplaceCurrentUser');
}

function updateLoginButton() {
  if(currentUser) {
    loginBtn.textContent = `Logout (${currentUser.name})`;
    loginBtn.setAttribute('aria-label', 'Keluar dari akun');
  } else {
    loginBtn.textContent = 'Masuk';
    loginBtn.setAttribute('aria-label', 'Masuk ke akun');
    loginBtn.setAttribute('aria-expanded', 'false');
  }
}

// ===========================
// Produk
// ===========================
async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE}/products.php`);
    if (!res.ok) {
      throw new Error(`Error: ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    if (!text) {
      throw new Error('Respons kosong dari server');
    }
    const data = JSON.parse(text);
    if (!Array.isArray(data)) {
      throw new Error('Data tidak dalam format array');
    }
    productsData = data;
    renderProducts();
  } catch (err) {
    productsContainer.innerHTML = `
      <p style="color:#e3342f; text-align:center; font-weight:bold;">${err.message}</p>
    `;
    console.error('Error saat mengambil produk:', err);
  }
}

function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.tabIndex = 0;
  card.setAttribute('aria-label', `Produk: ${product.title}, harga ${formatCurrency(product.price)}`);

  card.innerHTML = `
    <img src="${product.image_url}" alt="Foto ${product.title}" loading="lazy" />
    <h3 class="product-title">${product.title}</h3>
    <p class="product-description">${product.description}</p>
    <div class="product-price">${formatCurrency(product.price)}</div>
    <button class="btn primary add-to-cart-btn" data-id="${product.id}" aria-label="Tambah ${product.title} ke keranjang">Tambah ke Keranjang</button>
  `;
  return card;
}

function renderProducts(filterText = '') {
  productsContainer.innerHTML = '';
  let filtered = productsData.filter(p =>
    p.title.toLowerCase().includes(filterText.toLowerCase()) ||
    p.description.toLowerCase().includes(filterText.toLowerCase())
  );
  if(filtered.length === 0) {
    productsContainer.innerHTML = `<p style="color:#555;font-size:1.2rem;text-align:center;">Produk tidak ditemukan</p>`;
    return;
  }
  filtered.forEach(product => {
    const card = createProductCard(product);
    productsContainer.appendChild(card);
  });
}

searchInput.addEventListener('input', () => {
  renderProducts(searchInput.value);
});

// ===========================
// Keranjang
// ===========================
async function addToCart(productId, quantity=1) {
  if(!currentUser){
    alert('Silakan login terlebih dahulu');
    openLoginModal();
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/cart.php`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        user_id: currentUser.id,
        product_id: productId,
        quantity: quantity
      })
    });
    const data = await response.json();
    if(!response.ok) throw new Error(data.error || 'Gagal menambahkan ke keranjang');
    alert(data.message);
    fetchCartItems(); // refresh isi keranjang
  } catch(error) {
    alert(error.message);
  }
}


async function fetchCartItems() {
  if(!currentUser){
    cartItemsContainer.innerHTML = '<p>Silakan masuk untuk melihat keranjang</p>';
    cartTotalElem.textContent = formatCurrency(0);
    cartCountElem.textContent = '0';
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/cart.php?user_id=${currentUser.id}`);
    const data = await response.json();
    if(!response.ok) throw new Error(data.error || 'Gagal mengambil keranjang');
    renderCartItems(data);
  } catch(error) {
    cartItemsContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
  }
}


function renderCartItems(items) {
  cartItemsContainer.innerHTML = '';
  if(items.length === 0) {
    cartItemsContainer.innerHTML = '<p style="text-align:center;">Keranjang Anda kosong.</p>';
    cartTotalElem.textContent = formatCurrency(0);
    cartCountElem.textContent = '0';
    return;
  }
  let total = 0;
  let totalCount = 0;
  items.forEach(item => {
    total += item.price * item.quantity;
    totalCount += item.quantity;
    const itemDiv = document.createElement('div');
    itemDiv.className = 'cart-item';
    itemDiv.tabIndex = 0;
    itemDiv.setAttribute('aria-label', `Produk di keranjang: ${item.title}, jumlah ${item.quantity}, harga per item ${formatCurrency(item.price)}`);
    itemDiv.innerHTML = `
      <img src="${item.image_url}" alt="Foto ${item.title}" />
      <div class="cart-item-info">
        <div class="cart-item-title">${item.title}</div>
        <div class="cart-item-price">${formatCurrency(item.price)}</div>
      </div>
      <div class="cart-item-quantity" aria-label="Kontrol jumlah produk">
        <button class="qty-decrease" aria-label="Kurangi jumlah ${item.title}">-</button>
        <span aria-live="polite" aria-atomic="true">${item.quantity}</span>
        <button class="qty-increase" aria-label="Tambah jumlah ${item.title}">+</button>
      </div>
      <button class="btn link-btn remove-item" aria-label="Hapus ${item.title} dari keranjang">×</button>
    `;

    // Event quantity decrease (mengurangi 1 jika qty > 1, jika 1 hapus item)
itemDiv.querySelector('.qty-decrease').addEventListener('click', async () => {
  if (item.quantity > 1) {
    await updateCartItem(item.product_id, item.quantity - 1);
  } else {
    await removeCartItem(item.product_id);
  }
});

// Event quantity increase (menambah 1 setiap klik)
itemDiv.querySelector('.qty-increase').addEventListener('click', async () => {
  await updateCartItem(item.product_id, item.quantity + 1);
});

    // Event remove item
    itemDiv.querySelector('.remove-item').addEventListener('click', async () => {
      await removeCartItem(item.product_id);
    });

    cartItemsContainer.appendChild(itemDiv);
  });
  cartTotalElem.textContent = formatCurrency(total);
  cartCountElem.textContent = totalCount.toString();
}

async function updateCartItem(productId, newQuantity) {
  try {
    const res = await fetch(`${API_BASE}/cart.php`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        user_id: currentUser.id,
        product_id: productId,
        quantity: newQuantity
      })
    });
    if (!res.ok) throw new Error('Gagal memperbarui keranjang');
    await fetchCartItems(); // refresh keranjang setelah update
  } catch (err) {
    alert(err.message);
    console.error('Error update cart:', err);
  }
}

async function removeCartItem(productId) {
  try {
    const res = await fetch(`${API_BASE}/cart.php`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.id,
        product_id: productId
      })
    });
    if (!res.ok) throw new Error('Gagal hapus item keranjang');
    await fetchCartItems(); // Refresh isi keranjang setelah hapus
  } catch (err) {
    alert(err.message);
    console.error('Error remove cart item:', err);
  }
}

productsContainer.addEventListener('click', e => {
  if(e.target.classList.contains('add-to-cart-btn')) {
    const productId = e.target.dataset.id;
    addToCart(productId, 1);
  }
});

checkoutBtn.addEventListener('click', () => {
  if(!currentUser) {
    alert('Silakan login terlebih dahulu untuk melakukan checkout.');
    openLoginModal();
    return;
  }
  alert('Terima kasih telah melakukan pembelian di PhonePlace! Pesanan Anda sedang diproses.');
  // Biasanya keranjang akan dihapus setelah checkout di backend
  fetchCartItems();
  showPage('home');
});

// ===========================
// Login & Register Modal & Form
// ===========================
function openLoginModal() {
  loginModal.showModal();
  loginBtn.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
  loginForm.reset();
  loginForm.querySelector('input, button').focus();
}

function closeLoginModal() {
  loginModal.close();
  loginBtn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

function openRegisterModal() {
  registerModal.showModal();
  document.body.style.overflow = 'hidden';
  registerForm.reset();
  registerForm.querySelector('input, button').focus();
}

function closeRegisterModal() {
  registerModal.close();
  document.body.style.overflow = '';
}

modalCloseBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const dialog = btn.closest('dialog');
    if(dialog === loginModal) closeLoginModal();
    else if(dialog === registerModal) closeRegisterModal();
  });
});

loginModal.addEventListener('cancel', e => {
  e.preventDefault();
  closeLoginModal();
});

registerModal.addEventListener('cancel', e => {
  e.preventDefault();
  closeRegisterModal();
});

toRegisterBtn.addEventListener('click', () => {
  closeLoginModal();
  openRegisterModal();
});

toLoginBtn.addEventListener('click', () => {
  closeRegisterModal();
  openLoginModal();
});

// Login form submit
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = loginForm['email'].value.trim();
  const password = loginForm['password'].value;
  try {
    const res = await fetch(`${API_BASE}/login.php`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Login gagal');
    saveCurrentUser(data);
    updateLoginButton();
    closeLoginModal();
    alert(`Selamat datang kembali, ${data.name}!`);
    fetchCartItems();
  } catch(err) {
    alert(`Error login: ${err.message}`);
    console.error('Login error:', err);
  }
});

// Register form submit
registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  const name = registerForm['name'].value.trim();
  const email = registerForm['email'].value.trim();
  const password = registerForm['password'].value;
  const passwordConfirm = registerForm['passwordConfirm'].value;

  if(password !== passwordConfirm) {
    alert('Password dan konfirmasi password tidak cocok.');
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/register.php`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name, email, password})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Pendaftaran gagal');
    alert('Pendaftaran berhasil! Silakan masuk.');
    closeRegisterModal();
    openLoginModal();
  } catch(err) {
    alert(`Error daftar: ${err.message}`);
    console.error('Register error:', err);
  }
});

// Login button toggle login/logout
loginBtn.addEventListener('click', () => {
  if(currentUser) {
    if(confirm('Apakah Anda yakin ingin keluar?')) {
      clearCurrentUser();
      updateLoginButton();
      alert('Anda telah keluar.');
      fetchCartItems();
    }
  } else {
    openLoginModal();
  }
});


// ===========================
// Contact Us Form
// ===========================

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = contactForm.name.value.trim();
  const email = contactForm.email.value.trim();
  const message = contactForm.message.value.trim();

  if(!name || !email || !message){
    contactFeedback.textContent = 'Mohon lengkapi semua data.';
    contactFeedback.style.color = 'red';
    return;
  }

  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    contactFeedback.textContent = 'Email tidak valid.';
    contactFeedback.style.color = 'red';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/contact.php`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name, email, message })
    });
    const data = await response.json();
    if(!response.ok) throw new Error(data.error || 'Gagal mengirim pesan');
    contactFeedback.textContent = data.message;
    contactFeedback.style.color = 'green';
    contactForm.reset();
  } catch(error) {
    contactFeedback.textContent = error.message;
    contactFeedback.style.color = 'red';
  }
});


// ===========================
// Inisialisasi aplikasi
// ===========================
async function init() {
  initPageFromHash();
  loadCurrentUser();
  updateLoginButton();
  await fetchProducts();
  await fetchCartItems();
}

window.addEventListener('load', init);
