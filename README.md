# QualityHub – E-Commerce QA Software Testing Platform & Automation Engine

> **Live Deployment Link:** [https://prranay.github.io/Qualityhub/](https://prranay.github.io/Qualityhub/)

QualityHub is a specialized, fullstack **QA Software Testing Custom Platform** designed for testing e-commerce websites and REST APIs. Built with **Playwright**, **TypeScript**, and a declarative **JSON-driven engine**, it allows QA engineers to author and run automated UI and API tests by modifying JSON rather than writing repetitive test code.

Targets: [SauceDemo](https://www.saucedemo.com) (Live E-Commerce Store) and [Restful-Booker](https://restful-booker.herokuapp.com) (E-Commerce REST API).

---

## Live Features & Capabilities

- 🎯 **Target E-Commerce Environment Bar**: Switch between live e-commerce stores (`https://www.saucedemo.com`), API endpoints, or custom URLs.
- 🛒 **Cart & Multi-Step Checkout Flow Suite**: Automated validation for adding items, cart badge count updates, mandatory shipping address boundary checks, and order confirmation dispatch.
- 🔐 **Customer Auth & Persona Security Suite**: Standard customer logins, locked-out persona security blocks, invalid credentials handling, and empty form validation.
- 🔍 **Catalog Sorting & Inventory Suite**: DOM verification for inventory cards, price-sorting reordering (Low to High), and item details routing.
- ⚡ **E-Commerce REST API & Booking Lifecycle Suite**: Complete CRUD verification (POST auth token $\rightarrow$ POST booking $\rightarrow$ GET by ID $\rightarrow$ PATCH $\rightarrow$ DELETE $\rightarrow$ 404 assertion).
- 🔍 **Step-by-Step Assertion Inspector**: Real-time inspection of actions (`goto`, `fill`, `click`, `expectText`, `GET`, `POST`), target selectors, expected vs. actual HTTP status codes, and execution latency.
- ⚙️ **Dynamic JSON Scenarios Studio**: In-browser editor to view and customize scenario files (`scenarios/ui.json`, `scenarios/api.json`) dynamically.
- 🐞 **Defect Tracking & Audit Log**: Log, track, and categorize defects (`DEF-101`) linked directly to failing steps and target URLs.

---

## Quick Start (Local Run)

```bash
# 1. Install dependencies & Playwright Chromium browser
npm ci && npx playwright install chromium

# 2. Configure demo credentials
cp .env.example .env

# 3. Start the QualityHub QA Platform locally
npm start
# -> Open http://localhost:3000 in your browser

# 4. Run automated Playwright tests
npm test                              # Run all 10 tests
npm run smoke                         # Run @smoke tagged tests only
npx playwright test --grep "Login"    # Run single group
npm run report && npx playwright show-report
```

---

## How the Dynamic Engine Works

`scenarios/*.json` $\rightarrow$ `tests/*.spec.ts` generate one Playwright test per scenario $\rightarrow$ `engine/*.ts` runs its steps.

| UI Step Action | Supported Attributes |
|---|---|
| `goto`, `click`, `fill`, `expectUrl`, `expectVisible`, `expectText`, `call` (reusable flow) | `by` (`testid`, `placeholder`, `text`, `role` as `button\|Name`), `target`, `value`, `to` |

| API Step Action | Supported Attributes |
|---|---|
| `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | `path`, `body`, `headers`, `status`, `keys` (must exist), `equals` (must match), `save` (stores response field, reuse as `{{name}}`) |

- **Built-in Variables**: `{{rand}}` (unique dynamic UUID slice per run), `{{env.NAME}}` (secure environment substitution).
- **Data Chaining**: Capture generated IDs via `"save": { "id": "bookingid" }` and inject into subsequent requests as `/booking/{{id}}`.

---

## CI/CD & GitHub Pages Deployment

- **Automated CI Workflow** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): Runs `@smoke` tests on pull requests and nightly full regression with artifact generation.
- **GitHub Pages Deployment** ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)): Automatically deploys the QA Platform to [https://prranay.github.io/Qualityhub/](https://prranay.github.io/Qualityhub/) on every push to `main`.
