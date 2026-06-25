import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = process.env.APP_ROOT || join(import.meta.dirname, "..");
const source = readFileSync(join(root, "src/app/embed/card/movie/page.tsx"), "utf8");

test("Cinema info card passes the resolved app user into every TMDB request", () => {
  assert.match(source, /const session = await getSession\("ye-cinema"\)\.catch/);
  assert.match(source, /const userId = session\?\.userId/);
  assert.match(source, /tmdbFetch\("\/find\/" \+ extracted\.id,[\s\S]*?}, userId\)/);
  assert.match(source, /tmdbFetch\(`\/movie\/\$\{movieResults\[0\]\.id\}`,[\s\S]*?}, userId\)/);
  assert.match(source, /tmdbFetch\(`\/tv\/\$\{tvResults\[0\]\.id\}`,[\s\S]*?}, userId\)/);
  assert.match(source, /watch\/providers`,\n\s*undefined,\n\s*userId/);
});
