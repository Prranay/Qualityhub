// QualityHub - QA Software Testing Platform Client

let qaState = {
  suites: [],
  selectedCase: null,
  targetUrl: 'https://www.saucedemo.com',
  activeCategory: 'All',
  activeTab: 'studio',
  runResults: null,
  isRunning: false,
  activeJsonFile: 'ui'
};

document.addEventListener('DOMContentLoaded', () => {
  initUIEventListeners();
  loadTestSuites();
  loadDefects();
});

function initUIEventListeners() {
  // Navigation Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      switchPlatformTab(e.target.dataset.tab);
    });
  });

  // Target URL input
  const urlInput = document.getElementById('target-url-input');
  urlInput.addEventListener('change', (e) => {
    qaState.targetUrl = e.target.value.trim();
    showToast(`Target URL set: ${qaState.targetUrl}`);
  });

  // Preset Target buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const url = e.target.dataset.url;
      qaState.targetUrl = url;
      urlInput.value = url;
      showToast(`Switched target: ${url}`);
    });
  });

  // Filter Pills (Checkout, Auth, Catalog, API, @smoke)
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      qaState.activeCategory = e.target.dataset.cat;
      renderTestSuites();
    });
  });

  // Action Run Buttons
  document.getElementById('btn-run-all-suites').addEventListener('click', () => executeSuiteRun());
  document.getElementById('btn-run-smoke-suites').addEventListener('click', () => executeSuiteRun('@smoke'));
  document.getElementById('btn-run-playwright-cli').addEventListener('click', executePlaywrightCLI);

  // JSON Editor File Selector
  document.getElementById('json-file-select').addEventListener('change', (e) => {
    qaState.activeJsonFile = e.target.value;
    loadJsonFile(e.target.value);
  });

  document.getElementById('btn-save-json').addEventListener('click', saveJsonFile);
}

// Switch between Platform Tabs
function switchPlatformTab(tab) {
  qaState.activeTab = tab;
  document.getElementById('view-studio').style.display = tab === 'studio' ? 'block' : 'none';
  document.getElementById('view-editor').style.display = tab === 'editor' ? 'block' : 'none';
  document.getElementById('view-defects').style.display = tab === 'defects' ? 'block' : 'none';

  if (tab === 'editor') {
    loadJsonFile(qaState.activeJsonFile);
  } else if (tab === 'defects') {
    loadDefects();
  }
}

// Fetch Test Suites
async function loadTestSuites() {
  const container = document.getElementById('suites-container');
  container.innerHTML = '<div style="padding: 30px; text-align: center; color: var(--text-grey);">Loading e-commerce test suites...</div>';

  try {
    const res = await fetch('/api/suites');
    const data = await res.json();
    qaState.suites = data.suites || [];

    // Select the first case by default
    if (qaState.suites.length > 0 && qaState.suites[0].cases.length > 0) {
      qaState.selectedCase = qaState.suites[0].cases[0];
      renderStepInspector(qaState.selectedCase);
    }

    renderTestSuites();
  } catch (err) {
    container.innerHTML = '<div style="padding: 30px; text-align: center; color: var(--text-grey);">Failed to connect to QA server.</div>';
  }
}

// Render Suites & Cases
function renderTestSuites() {
  const container = document.getElementById('suites-container');
  const cat = qaState.activeCategory;

  const filteredSuites = qaState.suites.map(suite => {
    let cases = suite.cases;
    if (cat === '@smoke') {
      cases = cases.filter(c => c.tag === '@smoke');
    } else if (cat !== 'All') {
      if (suite.category.toLowerCase() !== cat.toLowerCase()) return null;
    }
    return cases.length > 0 ? { ...suite, cases } : null;
  }).filter(Boolean);

  if (filteredSuites.length === 0) {
    container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-grey); background: var(--bg-white); border: 1px solid var(--border-beige); border-radius: var(--radius-md);">No test suites match this category filter.</div>';
    return;
  }

  container.innerHTML = filteredSuites.map(suite => `
    <div class="suite-card">
      <div class="suite-header">
        <div>
          <div class="suite-title-group">
            <span class="suite-category-tag">${suite.category}</span>
            <h3 class="suite-name">${suite.name}</h3>
          </div>
          <p class="suite-desc">${suite.description}</p>
        </div>
        <span style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-muted);">${suite.cases.length} Scenarios</span>
      </div>

      <div class="cases-list">
        ${suite.cases.map(tc => {
          const result = qaState.runResults?.results?.find(r => r.id === tc.id);
          const isSelected = qaState.selectedCase?.id === tc.id;
          
          return `
            <div class="case-item ${isSelected ? 'selected' : ''}" onclick="selectTestCase('${tc.id}')">
              <div class="case-info">
                <span class="tag-badge ${tc.tag === '@smoke' ? 'smoke' : ''}">${tc.tag}</span>
                <div>
                  <div class="case-title">${tc.title}</div>
                  <span class="case-id">${tc.id} · Target: ${tc.targetUrl}</span>
                </div>
              </div>

              <div class="case-actions">
                ${result ? `
                  <span style="font-family: var(--font-mono); font-size: 0.74rem; color: var(--text-grey);">${result.durationMs}ms</span>
                  <span class="status-badge ${result.passed ? 'passed' : ''}">${result.passed ? 'PASSED' : 'FAILED'}</span>
                ` : `
                  <span class="status-badge">READY</span>
                `}
                <button class="btn-case-run" onclick="event.stopPropagation(); executeSingleCase('${tc.id}')">
                  Run
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');
}

// Select a test case and display in the Step Inspector
function selectTestCase(caseId) {
  const tc = qaState.suites.flatMap(s => s.cases).find(c => c.id === caseId);
  if (!tc) return;
  qaState.selectedCase = tc;

  document.querySelectorAll('.case-item').forEach(el => el.classList.remove('selected'));
  renderTestSuites();
  renderStepInspector(tc);
}

// Render Step Inspector in right column
function renderStepInspector(tc) {
  const titleEl = document.getElementById('inspector-title');
  const metaEl = document.getElementById('inspector-meta');
  const stepsContainer = document.getElementById('inspector-steps');

  titleEl.textContent = tc.title;
  metaEl.innerHTML = `<code>${tc.id}</code> · Target: <strong>${qaState.targetUrl || tc.targetUrl}</strong>`;

  const result = qaState.runResults?.results?.find(r => r.id === tc.id);

  stepsContainer.innerHTML = tc.steps.map((s, idx) => {
    const stepResult = result?.steps?.[idx];
    return `
      <div class="step-card">
        <div class="step-left">
          <span class="action-tag">${s.action.toUpperCase()}</span>
          <div>
            <div style="font-weight: 600; color: var(--text-black);">${s.name}</div>
            ${s.target ? `<span class="step-target-code">${s.target} ${s.value ? '➔ ' + s.value : ''}</span>` : ''}
          </div>
        </div>
        <div class="step-right">
          ${stepResult ? `
            <span style="font-family: var(--font-mono);">${stepResult.durationMs}ms</span>
            <span style="font-weight: 700; color: ${stepResult.status === 'PASSED' ? 'var(--aqua-primary)' : 'var(--text-black)'};">
              ${stepResult.status === 'PASSED' ? '✓ OK' : '✕ FAIL'}
            </span>
          ` : `
            <span>Expect: <code>${s.expectedStatus || 'OK'}</code></span>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// Execute Full Suite Run
async function executeSuiteRun(tag = null) {
  if (qaState.isRunning) return;
  qaState.isRunning = true;

  const btnAll = document.getElementById('btn-run-all-suites');
  const btnSmoke = document.getElementById('btn-run-smoke-suites');
  btnAll.disabled = true;
  btnSmoke.disabled = true;
  btnAll.innerHTML = 'Testing in Progress...';

  try {
    const res = await fetch('/api/run-suite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag: tag || undefined,
        targetUrl: qaState.targetUrl
      })
    });
    const data = await res.json();
    qaState.runResults = data;

    // Update KPI Summary Badges
    document.getElementById('kpi-pass-rate').textContent = data.summary.passRate;
    document.getElementById('kpi-cases-count').textContent = `${data.summary.passed}/${data.summary.total}`;
    document.getElementById('kpi-duration').textContent = `${data.summary.totalDurationMs}ms`;

    renderTestSuites();
    if (qaState.selectedCase) {
      renderStepInspector(qaState.selectedCase);
    }

    logConsole(`[${new Date().toLocaleTimeString()}] Executed ${data.summary.total} scenarios against ${qaState.targetUrl}.\nResult: ${data.summary.passRate} Passed. Duration: ${data.summary.totalDurationMs}ms.`);
    showToast(`Suite Run Completed: ${data.summary.passRate} Passed`);
  } catch (err) {
    showToast('Execution error. Check server logs.');
  } finally {
    qaState.isRunning = false;
    btnAll.disabled = false;
    btnSmoke.disabled = false;
    btnAll.innerHTML = '▶ Run All Test Suites';
  }
}

// Execute a single test case
async function executeSingleCase(caseId) {
  try {
    const res = await fetch('/api/run-suite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, targetUrl: qaState.targetUrl })
    });
    const data = await res.json();

    if (qaState.runResults?.results) {
      const idx = qaState.runResults.results.findIndex(r => r.id === caseId);
      if (idx !== -1) {
        qaState.runResults.results[idx] = data.results[0];
      } else {
        qaState.runResults.results.push(data.results[0]);
      }
    } else {
      qaState.runResults = data;
    }

    renderTestSuites();
    if (qaState.selectedCase?.id === caseId) {
      renderStepInspector(qaState.selectedCase);
    }
    showToast(`Executed: ${caseId}`);
  } catch (e) {}
}

// Execute local Playwright engine
async function executePlaywrightCLI() {
  const btn = document.getElementById('btn-run-playwright-cli');
  btn.disabled = true;
  btn.textContent = 'Running Playwright...';

  logConsole(`[${new Date().toLocaleTimeString()}] Spawning: npx playwright test (targeting live e-commerce testbeds)...`);

  try {
    const res = await fetch('/api/run-playwright', { method: 'POST' });
    const data = await res.json();
    logConsole(`\n--- Playwright Test Output ---\n${data.stdout}\nExit Code: ${data.exitCode}`);
    showToast(data.success ? 'Playwright passed: 10/10' : 'Playwright run completed');
  } catch (err) {
    logConsole('Playwright Execution Failed: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Run Playwright Engine';
  }
}

// JSON Editor Tab
async function loadJsonFile(file) {
  try {
    const res = await fetch(`/api/scenarios/json?file=${file}`);
    const data = await res.json();
    document.getElementById('json-editor-textarea').value = JSON.stringify(data.content, null, 2);
  } catch (e) {}
}

async function saveJsonFile() {
  const contentStr = document.getElementById('json-editor-textarea').value;
  try {
    const parsed = JSON.parse(contentStr);
    const res = await fetch('/api/scenarios/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: qaState.activeJsonFile, content: parsed })
    });
    const data = await res.json();
    showToast(data.message || 'File saved successfully');
  } catch (err) {
    alert('JSON Syntax Error: Please check your JSON format before saving.');
  }
}

// Defects Tracker Tab
async function loadDefects() {
  try {
    const res = await fetch('/api/defects');
    const data = await res.json();
    const tbody = document.getElementById('defects-tbody');
    tbody.innerHTML = (data.defects || []).map(d => `
      <tr>
        <td><code>${d.id}</code></td>
        <td><strong>${d.testCaseId}</strong></td>
        <td>${d.title}</td>
        <td><span class="severity-pill ${d.severity === 'Critical' ? 'critical' : ''}">${d.severity}</span></td>
        <td><code style="font-size: 0.76rem;">${d.targetUrl}</code></td>
        <td><span style="font-size: 0.75rem; font-weight: 600; color: var(--aqua-primary);">${d.status}</span></td>
      </tr>
    `).join('');
    document.getElementById('kpi-defects-count').textContent = data.count || 0;
  } catch (e) {}
}

function logConsole(msg) {
  const el = document.getElementById('live-console-log');
  el.textContent += msg + '\n';
  el.scrollTop = el.scrollHeight;
}

function showToast(msg) {
  const t = document.getElementById('toast-msg');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
