// Turns Playwright's JSON report into [suite, passed, failed, skipped, defectId] rows for the dashboard.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

if (!existsSync('report/results.json')) {
  console.warn('Warning: report/results.json not found. Run tests first.');
  process.exit(0);
}

const { suites = [] } = JSON.parse(readFileSync('report/results.json', 'utf8'));
const rows = [];

const walk = (suite) => {
  if (suite.specs?.length) {
    const row = [suite.title, 0, 0, 0];
    for (const spec of suite.specs) for (const t of spec.tests || []) {
      const i = t.status === 'unexpected' ? 2 : t.status === 'skipped' ? 3 : 1;
      row[i]++;
      const bug = (t.annotations || []).find((a) => a.type === 'bug');
      if (i === 2 && bug?.description) {
        row[4] = row[4] ? `${row[4]}, ${bug.description}` : bug.description;
      }
    }
    rows.push(row);
  }
  suite.suites?.forEach(walk);
};
suites.forEach(walk);

writeFileSync('dashboard/summary.json', JSON.stringify(rows));
console.log(`dashboard/summary.json: ${rows.length} suites`);
