import { test } from '@playwright/test';
import { runApi, ApiStep } from '../engine/api';
import { load } from '../engine/load';

type Scenario = { title: string; tags?: string[]; bug?: string; steps: ApiStep[] };

for (const [group, list] of Object.entries(load<Record<string, Scenario[]>>('api.json'))) {
  test.describe(group, () => {
    for (const s of list) {
      test(s.title, { tag: s.tags, annotation: s.bug ? { type: 'bug', description: s.bug } : undefined },
        ({ request }) => runApi(request, s.steps));
    }
  });
}
