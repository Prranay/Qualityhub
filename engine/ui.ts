import { Page, expect } from '@playwright/test';

export type Step = { do: string; by?: string; target?: string; value?: string; to?: string };
type Role = Parameters<Page['getByRole']>[0];

// {{env.NAME}} is the only substitution allowed; a missing variable fails loudly.
const sub = (s = '') => s.replace(/{{env\.(\w+)}}/g, (_, k) => {
  const v = process.env[k];
  if (v === undefined) throw new Error(`missing env var ${k}`);
  return v;
});

const find = (page: Page, s: Step) => {
  const t = sub(s.target);
  switch (s.by) {
    case 'testid': return page.getByTestId(t);
    case 'placeholder': return page.getByPlaceholder(t);
    case 'text': return page.getByText(t);
    case 'role': { const [role, name] = t.split('|'); return page.getByRole(role as Role, name ? { name } : {}); }
    default: throw new Error(`unknown locator type: ${s.by}`);
  }
};

// Only the actions below can run: scenario files cannot execute arbitrary code.
export async function run(page: Page, steps: Step[], flows: Record<string, Step[]> = {}): Promise<void> {
  for (const s of steps) {
    switch (s.do) {
      case 'goto': await page.goto(sub(s.to)); break;
      case 'fill': await find(page, s).fill(sub(s.value)); break;
      case 'click': await find(page, s).click(); break;
      case 'expectUrl': await expect(page).toHaveURL(new RegExp(sub(s.value ?? ''))); break;
      case 'expectVisible': await expect(find(page, s)).toBeVisible(); break;
      case 'expectText': await expect(find(page, s)).toContainText(sub(s.value)); break;
      case 'call': {
        const flow = flows[s.to ?? ''];
        if (!flow) throw new Error(`unknown flow: ${s.to}`);
        await run(page, flow, flows); break;
      }
      default: throw new Error(`unknown action: ${s.do}`);
    }
  }
}
