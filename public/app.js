// QualityHub Fullstack E-Commerce & QA Platform Client

let state = {
  products: [],
  cart: { items: [], subtotal: 0, count: 0 },
  activeTab: 'store', // 'store' or 'qa'
  currentCategory: 'All',
  searchQuery: '',
  sortOrder: 'default',
  currentUser: 'standard_user',
  qaScenarios: [],
  qaResults: null,
  isTesting: false
};

// Initialize app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadProducts();
  loadCart();
  loadQAScenarios();
});

// Event Listeners
function initEventListeners() {
  // Navigation Tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      switchView(e.target.dataset.tab);
    });
  });

  // Cart Drawer toggles
  document.getElementById('cart-open-btn').addEventListener('click', () => openCartDrawer(true));
  document.getElementById('cart-close-btn').addEventListener('click', () => openCartDrawer(false));
  document.getElementById('cart-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'cart-backdrop') openCartDrawer(false);
  });

  // Category filters
  document.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      state.currentCategory = e.target.dataset.category;
      loadProducts();
    });
  });

  // Search input with debounce
  const searchInput = document.getElementById('search-input');
  let debounceTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      state.searchQuery = e.target.value.trim();
      loadProducts();
    }, 250);
  });

  // Sort dropdown
  document.getElementById('sort-select').addEventListener('change', (e) => {
    state.sortOrder = e.target.value;
    loadProducts();
  });

  // Persona switch
  document.getElementById('persona-select').addEventListener('change', (e) => {
    state.currentUser = e.target.value;
    showToast(`Persona switched to: ${state.currentUser}`);
  });

  // Checkout form submission
  document.getElementById('checkout-form').addEventListener('submit', handleCheckout);

  // QA Run buttons
  document.getElementById('btn-run-all-qa').addEventListener('click', () => runQASuite());
  document.getElementById('btn-run-smoke-qa').addEventListener('click', () => runQASuite('@smoke'));
  document.getElementById('btn-run-playwright').addEventListener('click', runPlaywrightSuite);
}

// Switch between Store and QA Hub
function switchView(tab) {
  state.activeTab = tab;
  const storeView = document.getElementById('store-view');
  const qaView = document.getElementById('qa-view');

  if (tab === 'qa') {
    storeView.style.display = 'none';
    qaView.style.display = 'block';
    renderQAScenarios();
  } else {
    storeView.style.display = 'block';
    qaView.style.display = 'none';
  }
}

// Load Products from REST API
async function loadProducts() {
  const container = document.getElementById('products-grid');
  container.innerHTML = '<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-grey);">Loading catalog...</div>';

  let url = `/api/products?category=${encodeURIComponent(state.currentCategory)}`;
  if (state.searchQuery) url += `&search=${encodeURIComponent(state.searchQuery)}`;
  if (state.sortOrder !== 'default') url += `&sort=${encodeURIComponent(state.sortOrder)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    state.products = data.products || [];
    renderProducts(state.products);
  } catch (err) {
    container.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-grey);">Failed to load products. Check local server.</div>`;
  }
}

// Render Products Grid
function renderProducts(list) {
  const container = document.getElementById('products-grid');
  if (!list.length) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; padding: 60px 20px; text-align: center; background: var(--bg-beige); border-radius: var(--radius-lg); border: 1px solid var(--border-beige);">
        <p style="font-size: 1.1rem; font-weight: 600; color: var(--text-black);">No products match your criteria</p>
        <p style="font-size: 0.85rem; color: var(--text-grey); margin-top: 4px;">Try searching for "Headphones", "Keyboard", or switch categories.</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map(prod => `
    <div class="product-card" data-id="${prod.id}">
      <div class="product-img-wrapper">
        <img src="${prod.image}" alt="${prod.name}" class="product-img" loading="lazy" />
        ${prod.badge ? `<span class="product-badge">${prod.badge}</span>` : ''}
      </div>
      <div class="product-info">
        <span class="product-cat">${prod.category}</span>
        <h3 class="product-name">${prod.name}</h3>
        <p class="product-desc">${prod.description}</p>
        <div class="product-meta">
          <span class="product-price">$${prod.price.toFixed(2)}</span>
          <span class="product-rating">★ ${prod.rating} (${prod.reviewsCount})</span>
        </div>
        <div class="product-actions">
          <button class="btn-add-cart" onclick="addToCart('${prod.id}')" data-test="add-to-cart-${prod.id}">
            Add to Cart
          </button>
          <button class="btn-quick-test" title="Run QA Assertions on this product" onclick="quickTestProduct('${prod.id}')">
            QA Check
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Cart Operations
async function loadCart() {
  try {
    const res = await fetch('/api/cart');
    const data = await res.json();
    state.cart = data;
    updateCartUI();
  } catch (e) {}
}

async function addToCart(productId) {
  try {
    const res = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: 1 })
    });
    const data = await res.json();
    if (data.success) {
      await loadCart();
      showToast('Added to cart');
    }
  } catch (err) {
    showToast('Failed to add item to cart');
  }
}

async function updateCartQty(productId, newQty) {
  try {
    await fetch('/api/cart/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: newQty })
    });
    await loadCart();
  } catch (err) {}
}

function updateCartUI() {
  document.getElementById('cart-count-badge').textContent = state.cart.count || 0;
  document.getElementById('hero-cart-count').textContent = state.cart.count || 0;
  
  const drawerItems = document.getElementById('drawer-items-list');
  if (!state.cart.items || state.cart.items.length === 0) {
    drawerItems.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: var(--text-grey);">
        <p style="font-weight: 600; color: var(--text-black);">Your test cart is empty</p>
        <p style="font-size: 0.8rem; margin-top: 4px;">Click 'Add to Cart' on any product in the catalog.</p>
      </div>`;
    document.getElementById('drawer-subtotal').textContent = '$0.00';
    document.getElementById('drawer-total').textContent = '$0.00';
    return;
  }

  drawerItems.innerHTML = state.cart.items.map(item => `
    <div class="cart-item-row">
      <img src="${item.product.image}" class="cart-item-img" alt="${item.product.name}" />
      <div class="cart-item-details">
        <h4 class="cart-item-name">${item.product.name}</h4>
        <div class="cart-item-price">$${item.product.price.toFixed(2)}</div>
        <div class="qty-control">
          <button class="qty-btn" onclick="updateCartQty('${item.productId}', ${item.quantity - 1})">-</button>
          <span style="font-size: 0.85rem; font-weight: 600; min-width: 20px; text-align: center;">${item.quantity}</span>
          <button class="qty-btn" onclick="updateCartQty('${item.productId}', ${item.quantity + 1})">+</button>
        </div>
      </div>
    </div>
  `).join('');

  const subtotal = state.cart.subtotal || 0;
  const discount = subtotal > 150 ? 15.00 : 0.00;
  const total = subtotal - discount;

  document.getElementById('drawer-subtotal').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('drawer-discount').textContent = `-$${discount.toFixed(2)}`;
  document.getElementById('drawer-total').textContent = `$${total.toFixed(2)}`;
}

function openCartDrawer(isOpen) {
  const backdrop = document.getElementById('cart-backdrop');
  if (isOpen) {
    backdrop.classList.add('open');
    document.getElementById('checkout-alert').style.display = 'none';
  } else {
    backdrop.classList.remove('open');
  }
}

// Checkout Submission
async function handleCheckout(e) {
  e.preventDefault();
  const alertEl = document.getElementById('checkout-alert');
  const btn = document.getElementById('btn-checkout-submit');

  const firstName = document.getElementById('input-first-name').value.trim();
  const lastName = document.getElementById('input-last-name').value.trim();
  const postalCode = document.getElementById('input-postal-code').value.trim();

  btn.disabled = true;
  btn.textContent = 'Processing Order...';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, postalCode })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      alertEl.className = 'checkout-alert success';
      alertEl.innerHTML = `<strong>Order Confirmed!</strong> ID: <code>${data.order.id}</code><br/>Total: $${data.order.total.toFixed(2)} (Cart reset for next test)`;
      await loadCart();
      showToast(`Order created: ${data.order.id}`);
    } else {
      alertEl.className = 'checkout-alert error';
      alertEl.textContent = data.error || 'Checkout validation failed';
    }
  } catch (err) {
    alertEl.className = 'checkout-alert error';
    alertEl.textContent = 'Network error during checkout';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm Test Order';
  }
}

// ==========================================
// QA Testing Hub Implementation
// ==========================================

async function loadQAScenarios() {
  try {
    const res = await fetch('/api/qa/scenarios');
    state.qaScenarios = await res.json();
    renderQAScenarios();
  } catch (e) {}
}

function renderQAScenarios() {
  const container = document.getElementById('scenarios-container');
  if (!state.qaScenarios.length) {
    container.innerHTML = '<div style="padding: 20px; color: var(--text-grey);">Loading QA test suite...</div>';
    return;
  }

  container.innerHTML = state.qaScenarios.map(sc => {
    const result = state.qaResults?.results?.find(r => r.id === sc.id);
    const isPassed = result ? result.passed : null;

    return `
      <div class="scenario-card ${isPassed === true ? 'passed' : isPassed === false ? 'failed' : ''}" id="sc-card-${sc.id}">
        <div class="scenario-header" onclick="toggleScenarioDetails('${sc.id}')">
          <div class="sc-info-left">
            <span class="sc-tag-pill ${sc.tag === '@smoke' ? 'smoke' : ''}">${sc.tag}</span>
            <div>
              <span class="sc-title">${sc.title}</span>
              <span class="sc-target">[Target: ${sc.target}]</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            ${result ? `
              <span style="font-size: 0.78rem; font-family: monospace; color: var(--text-grey);">${result.durationMs}ms</span>
              <span class="sc-status-pill ${result.passed ? 'pass' : 'fail'}">${result.passed ? 'PASSED' : 'FAILED'}</span>
            ` : `
              <span class="sc-status-pill">READY</span>
            `}
            <button class="btn-quick-test" style="padding: 4px 12px; font-size: 0.75rem;" onclick="event.stopPropagation(); runSingleScenario('${sc.id}')">
              Run
            </button>
          </div>
        </div>
        <div class="steps-drawer" id="steps-drawer-${sc.id}" style="${result ? 'display: flex;' : 'display: none;'}">
          ${sc.steps.map(step => {
            const stepResult = result?.steps?.find(s => s.name === step.name);
            return `
              <div class="step-row">
                <div class="step-name-box">
                  <span class="step-method">${step.action}</span>
                  <span style="font-weight: 500; color: var(--text-black);">${step.name}</span>
                  <code style="font-size: 0.75rem; color: var(--text-grey);">${step.endpoint}</code>
                </div>
                <div class="step-meta">
                  <span>Expect: <code>${step.expectedStatus}</code></span>
                  ${stepResult ? `
                    <span>Actual: <code>${stepResult.actualStatus}</code></span>
                    <span style="font-weight: 700; color: ${stepResult.passed ? 'var(--aqua-primary)' : 'var(--text-black)'}">
                      ${stepResult.passed ? '✓ MATCH' : '✕ MISMATCH'}
                    </span>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function toggleScenarioDetails(id) {
  const drawer = document.getElementById(`steps-drawer-${id}`);
  if (drawer.style.display === 'none') {
    drawer.style.display = 'flex';
  } else {
    drawer.style.display = 'none';
  }
}

async function runQASuite(tagFilter = null) {
  if (state.isTesting) return;
  state.isTesting = true;

  const btnAll = document.getElementById('btn-run-all-qa');
  const btnSmoke = document.getElementById('btn-run-smoke-qa');
  btnAll.disabled = true;
  btnSmoke.disabled = true;
  btnAll.innerHTML = 'Testing in Progress...';

  try {
    const res = await fetch('/api/qa/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tagFilter ? { tag: tagFilter } : {})
    });
    const data = await res.json();
    state.qaResults = data;

    // Update QA Metric Cards
    document.getElementById('metric-pass-rate').textContent = data.summary.passRate;
    document.getElementById('metric-tests-count').textContent = `${data.summary.passed}/${data.summary.total}`;
    document.getElementById('metric-duration').textContent = `${data.summary.totalDurationMs}ms`;
    document.getElementById('metric-defects').textContent = data.summary.failed;

    renderQAScenarios();
    showToast(`QA run complete: ${data.summary.passRate} passed`);
  } catch (err) {
    showToast('QA Test run encountered an error');
  } finally {
    state.isTesting = false;
    btnAll.disabled = false;
    btnSmoke.disabled = false;
    btnAll.innerHTML = '▶ Run All QA Scenarios';
  }
}

async function runSingleScenario(scenarioId) {
  try {
    const res = await fetch('/api/qa/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId })
    });
    const data = await res.json();
    
    if (state.qaResults && state.qaResults.results) {
      const idx = state.qaResults.results.findIndex(r => r.id === scenarioId);
      if (idx !== -1) {
        state.qaResults.results[idx] = data.results[0];
      } else {
        state.qaResults.results.push(data.results[0]);
      }
    } else {
      state.qaResults = data;
    }
    renderQAScenarios();
    showToast(`Scenario ${scenarioId} executed`);
  } catch (e) {}
}

async function quickTestProduct(productId) {
  switchView('qa');
  await runSingleScenario('QA-01');
}

// Run Playwright Suite from browser
async function runPlaywrightSuite() {
  const outputEl = document.getElementById('playwright-output');
  const btn = document.getElementById('btn-run-playwright');
  
  outputEl.style.display = 'block';
  outputEl.textContent = 'Spawning Playwright runner via local Node harness... Please wait (running tests against local & target sites)...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/qa/run-playwright', { method: 'POST' });
    const data = await res.json();
    outputEl.textContent = data.stdout || 'Playwright finished with no console output.';
    showToast(data.success ? 'Playwright tests passed!' : 'Playwright run finished');
  } catch (err) {
    outputEl.textContent = 'Error executing local Playwright command: ' + err.message;
  } finally {
    btn.disabled = false;
  }
}

// Toast notification
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}
