import { join } from "path";
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "fs";
import { getDb } from "../db";
import type { LicenseStatus, McpSetup, WhitelistEntry } from "@shared/types";

export const PRO_REQUIRED_MESSAGE = "Paperweight Pro is required. Upgrade in Settings to continue.";

export function requirePro(): void {
  // No-op: this fork has no Pro gate.
}

// --- Key-value settings ---

export function getSetting(key: string): string | undefined {
  const d = getDb();
  const row = d.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

export function saveSetting(key: string, value: string): void {
  const d = getDb();
  d.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(
    key,
    value
  );
}

// --- Whitelist ---

export function addWhitelistEntry(value: string): void {
  const d = getDb();
  d.prepare("INSERT OR IGNORE INTO whitelist (value) VALUES (?)").run(
    value.toLowerCase()
  );
}

export function removeWhitelistEntry(value: string): void {
  const d = getDb();
  d.prepare("DELETE FROM whitelist WHERE value = ?").run(value.toLowerCase());
}

export function getWhitelistEntries(): WhitelistEntry[] {
  const d = getDb();
  return d
    .prepare("SELECT * FROM whitelist ORDER BY created_at")
    .all() as WhitelistEntry[];
}

// --- Auto-launch ---

const DESKTOP_FILE_NAME = "paperweight.desktop";

function getLinuxAutostartPath() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { app } = require("electron") as typeof import("electron");
  const configDir =
    process.env["XDG_CONFIG_HOME"] || join(app.getPath("home"), ".config");
  return join(configDir, "autostart", DESKTOP_FILE_NAME);
}

function applyLinuxAutostart(enabled: boolean, minimized: boolean) {
  const filePath = getLinuxAutostartPath();

  if (!enabled) {
    if (existsSync(filePath)) unlinkSync(filePath);
    return;
  }

  const exec = minimized ? `${process.execPath} --hidden` : process.execPath;

  const content = [
    "[Desktop Entry]",
    "Type=Application",
    "Name=Paperweight",
    `Exec=${exec}`,
    "X-GNOME-Autostart-enabled=true",
    "",
  ].join("\n");

  mkdirSync(join(filePath, ".."), { recursive: true });
  writeFileSync(filePath, content);
}

export function applyAutoLaunch(enabled: boolean, minimized: boolean): void {
  if (process.platform === "linux") {
    applyLinuxAutostart(enabled, minimized);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { app } = require("electron") as typeof import("electron");
  app.setLoginItemSettings({
    openAtLogin: enabled,
    args: enabled && minimized ? ["--hidden"] : [],
  });
}

export function wasLaunchedAsHidden(launchMinimized: boolean): boolean {
  if (process.argv.includes("--hidden")) return true;
  if (process.platform === "darwin" && launchMinimized) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require("electron") as typeof import("electron");
    return app.getLoginItemSettings().wasOpenedAtLogin;
  }
  return false;
}

// --- MCP setup ---

export function getMcpSetup(): McpSetup {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { app } = require("electron") as typeof import("electron");
  const launcher = process.platform === "win32"
    ? "paperweight-mcp.cmd"
    : "paperweight-mcp";
  const command = app.isPackaged
    ? join(process.resourcesPath, launcher)
    : join(app.getAppPath(), "build", "mcp", launcher);
  return existsSync(command)
    ? { available: true, server: { command } }
    : { available: false };
}

// --- License ---
//
// This fork ships without a paywall. Every feature the upstream project gates
// behind Paperweight Pro is available, and the app never contacts a license
// server. The exported names are kept so callers stay unchanged.

export function getLicenseStatus(): LicenseStatus {
  return { active: true, tier: "lifetime" };
}

export async function hasValidLicense(): Promise<boolean> {
  return true;
}
