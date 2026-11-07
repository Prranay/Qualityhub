import { test } from '@playwright/test';
import { run, Step } from '../engine/ui';
import { load } from '../engine/load';

type Scenario = { title: string; tags?: string[]; bug?: string; steps: Step[] };
const { flows = {}, groups = {} } = load<{ flows?: Record<string, Step[]>; groups: Record<string, Scenario[]> }>('ui.json');

for (const [group, list] of Object.entries(groups)) {
  test.describe(group, () => {
    for (const s of list) {
      test(s.title, { tag: s.tags, annotation: s.bug ? { type: 'bug', description: s.bug } : undefined },
        ({ page }) => run(page, s.steps, flows));
    }
  });
}
