// Improved product fetching with more robust error handling
async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE}/products.php`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch products: ${res.status} ${res.statusText} - ${text}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('Products API did not return an array');
    }
    productsData = data;
    renderProducts();
  } catch (err) {
    productsContainer.innerHTML = `<p style="color:#e3342f; text-align:center; font-weight:bold;">${err.message}</p>`;
    console.error('Error fetching products:', err);
  }
}

// Improved login form submit handler
loginForm.addEventListener('submit', async e => {
  e.preventDefault();

  const email = loginForm['email'].value.trim();
  const password = loginForm['password'].value;

  try {
    const res = await fetch(`${API_BASE}/login.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    let data;
    try {
      data = await res.json();
    } catch (jsonErr) {
      const text = await res.text();
      throw new Error(`Invalid JSON response from login API: ${text}`);
    }

    if (!res.ok) {
      throw new Error(data.error || `Login failed with status ${res.status}`);
    }

    saveCurrentUser(data);
    updateLoginButton();
    closeLoginModal();
    alert(`Selamat datang kembali, ${data.name}!`);
  } catch (err) {
    alert(`Login error: ${err.message}`);
    console.error('Login error:', err);
  }
});