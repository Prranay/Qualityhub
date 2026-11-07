import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const load = <T>(file: string): T =>
  JSON.parse(readFileSync(join(__dirname, '..', 'scenarios', file), 'utf8'));
