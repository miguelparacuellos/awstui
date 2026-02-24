import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export type Profile = {
  name: string;
  region: string | undefined;
};

function parseIni(content: string): Map<string, Record<string, string>> {
  const sections = new Map<string, Record<string, string>>();
  let current: Record<string, string> | null = null;

  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      const section = line.slice(1, -1).trim();
      current = {};
      sections.set(section, current);
    } else if (current) {
      const eq = line.indexOf('=');
      if (eq !== -1) {
        const key = line.slice(0, eq).trim();
        const value = line.slice(eq + 1).trim();
        current[key] = value;
      }
    }
  }

  return sections;
}

function readFileOrNull(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

export function listProfiles(): Profile[] {
  const profiles = new Map<string, Profile>();

  const credContent = readFileOrNull(join(homedir(), '.aws', 'credentials'));
  if (credContent) {
    for (const [section, values] of parseIni(credContent)) {
      profiles.set(section, { name: section, region: values['region'] });
    }
  }

  const configContent = readFileOrNull(join(homedir(), '.aws', 'config'));
  if (configContent) {
    for (const [section, values] of parseIni(configContent)) {
      const name = section === 'default' ? 'default' : section.replace(/^profile /, '');
      const existing = profiles.get(name);
      profiles.set(name, {
        name,
        region: values['region'] ?? existing?.region,
      });
    }
  }

  return Array.from(profiles.values());
}
