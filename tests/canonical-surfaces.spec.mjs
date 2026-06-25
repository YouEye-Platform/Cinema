import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = process.env.APP_ROOT || join(import.meta.dirname, "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function versionPattern() {
  const packageJson = JSON.parse(read("package.json"));
  const escaped = packageJson.version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`version: "?${escaped}"?`);
}

test("Cinema publishes canonical surfaces in runtime and install manifests", () => {
  const route = read("src/app/api/manifest/route.ts");
  const yaml = read("youeye-app.yaml");

  assert.match(route, /version: packageJson\.version/);
  assert.match(route, /surfaceSchemaVersion: 1/);
  assert.match(route, /surfaces:\s*\[/);
  assert.match(route, /kind: "settings-panel"/);
  assert.match(route, /kind: "widget"/);
  assert.match(route, /kind: "info-card"/);
  assert.match(route, /kind: "timeline-card"/);
  assert.doesNotMatch(route, /\n\s+widgets:\s*\[/);
  assert.doesNotMatch(route, /\n\s+info_cards:\s*\[/);

  assert.match(yaml, versionPattern());
  assert.match(yaml, /surfaceSchemaVersion: 1/);
  assert.match(yaml, /- id: now-watching/);
  assert.match(yaml, /kind: settings-panel/);
  assert.match(yaml, /kind: info-card/);
  assert.match(yaml, /- cinema-search/);
});
