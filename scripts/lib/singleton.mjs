// Read a Keystatic singleton's JSON (data format = json → src/content/settings/<name>.json).
// Returns the parsed object, or null when the singleton hasn't been created in the CMS yet.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function readSingleton(name) {
  const file = resolve(ROOT, 'src/content/settings', `${name}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}
