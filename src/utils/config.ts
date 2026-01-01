import { homedir } from "os";
import { join } from "path";
import { mkdir, readFile, writeFile } from "fs/promises";

const CONFIG_DIR = join(homedir(), ".yoto-cli");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface Config {
  clientId: string;
  accessToken?: string;
  refreshToken?: string;
}

export async function ensureConfigDir(): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
}

export async function loadConfig(): Promise<Config | null> {
  try {
    const data = await readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await ensureConfigDir();
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function clearConfig(): Promise<void> {
  await ensureConfigDir();
  await writeFile(CONFIG_FILE, "{}");
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}
