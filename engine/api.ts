import { APIRequestContext, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

export type ApiStep = {
  name: string; method: string; path: string; headers?: object; body?: object;
  status: number; keys?: string[]; equals?: object; save?: Record<string, string>;
};
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export async function runApi(request: APIRequestContext, steps: ApiStep[]): Promise<void> {
  // {{rand}} gives unique data per run; saved response fields are added as the steps go.
  const vars: Record<string, string> = { rand: randomUUID().slice(0, 8) };
  // Walks strings, arrays and objects: values are never spliced into JSON text, so no injection.
  const fill = (v: any): any =>
    typeof v === 'string' ? v.replace(/{{(env\.)?(\w+)}}/g, (_, e, k) => {
      const val = e ? process.env[k] : vars[k];
      if (val === undefined) throw new Error(`missing {{${e ?? ''}${k}}}`);
      return val;
    })
    : Array.isArray(v) ? v.map(fill)
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)]))
    : v;

  for (const s of steps) {
    const method = s.method?.toUpperCase();
    if (!METHODS.includes(method)) throw new Error(`bad method: ${s.method}`);
    const res = await request.fetch(fill(s.path), {
      method, data: fill(s.body), headers: { Accept: 'application/json', ...fill(s.headers) },
    });
    expect(res.status(), s.name).toBe(s.status);
    const json = await res.json().catch(() => ({}));
    for (const k of s.keys ?? []) expect(json, s.name).toHaveProperty(k);
    expect(json, s.name).toMatchObject(fill(s.equals ?? {}));
    for (const [name, field] of Object.entries(s.save ?? {})) {
      const val = json[field];
      if (val === undefined) throw new Error(`cannot save variable '${name}': field '${field}' not found in response`);
      vars[name] = String(val);
    }
  }
}
