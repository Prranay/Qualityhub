# QualityHub

JSON-driven UI and API test automation (Playwright + TypeScript). Add a test by editing JSON, not code.
Targets: [SauceDemo](https://www.saucedemo.com) (UI) and [Restful-Booker](https://restful-booker.herokuapp.com) (API).

## Run
```bash
npm ci && npx playwright install chromium
cp .env.example .env                  # public demo credentials; never commit real ones
npm test                              # everything
npm run smoke                         # @smoke only
npx playwright test --grep "Login"    # one group
npm run report && npx playwright show-report
```
Open `dashboard/index.html` through any static server (e.g. `npx serve dashboard`) to see the dashboard.
Point at another environment with `UI_URL` / `API_URL`.

## How the dynamic part works
`scenarios/*.json` -> `tests/*.spec.ts` generate one Playwright test per scenario -> `engine/*.ts` runs its steps.

| UI step | Fields |
|---|---|
| `goto`, `click`, `fill`, `expectUrl`, `expectVisible`, `expectText`, `call` (reuse a flow) | `by` (testid, placeholder, text, `role` as `button\|Name`), `target`, `value`, `to` |

| API step | Fields |
|---|---|
| any of GET/POST/PUT/PATCH/DELETE | `path`, `body`, `headers`, `status`, `keys` (must exist), `equals` (must match), `save` (store a response field, reuse as `{{name}}`) |

Built-ins: `{{rand}}` (unique per run), `{{env.NAME}}` (from environment). Add `"tags": ["@smoke"]` and `"bug": "BUG-12"` to any scenario.

## Security choices
Secrets come from env/CI secrets; a missing one stops the run. Scenario files can only trigger the allow-listed actions, and
substitution walks values instead of building JSON text, so data cannot break out. CI uses read-only permissions.

## Status
Done: UI engine, API engine, tags, env config, JSON report -> dashboard, CI.
Verified: types compile, UI tests generate (7), API tests run green (3) and fail correctly on bad input,
using a local stand-in for Restful-Booker. **Not yet run:** the UI tests in a real browser and CI on GitHub. Do both first.

## Remaining steps (do in this order)
1. **First real run.** Run `npm test` locally. Fix any selector or text that differs on the live sites. Put a failure you find
   into `scenarios/*.json` with a `"bug"` ID.
2. **GitHub.** Push, add secrets `SAUCE_PASS`, `BOOKER_USER`, `BOOKER_PASS`, and confirm the PR smoke job and the nightly job run.
3. **Pages.** Add a deploy step (`actions/deploy-pages`) for `dashboard/` + `playwright-report/` for a live recruiter link.
4. **Accessibility.** `npm i -D @axe-core/playwright`; add an `a11y` action in `engine/ui.ts` that expects `violations` to be empty.
5. **Performance.** Add `perf/search.js` (k6): 20 virtual users for 30s on search and checkout, thresholds `p(95)<800ms`, error rate under 1%.
6. **Security.** Run OWASP ZAP baseline against Juice Shop (`zaproxy/action-baseline`) and document 3 findings.
7. **Manual QA docs.** `docs/`: test strategy (2 pages), 50 test cases, traceability matrix, 10+ bug reports.
8. **Polish.** Docker (`mcr.microsoft.com/playwright` image), architecture diagram, 3-minute demo video.

## Resume bullet
Built a JSON-driven test automation framework (Playwright, TypeScript) generating UI and API tests from scenario files, with data chaining,
tag-based smoke/regression runs, GitHub Actions CI and a results dashboard linking failures to defect IDs.
