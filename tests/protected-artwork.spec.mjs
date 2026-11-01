import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = join(import.meta.dirname, "..");

function imageRoute(session, upstream = new Response("jpeg", { headers: { "content-type": "image/jpeg" } })) {
  const calls = [];
  const source = readFileSync(join(root, "src/app/api/tmdb/image/[...path]/route.ts"), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, Response, Headers,
    require(name) {
      if (name === "next/server") return { NextResponse: { json: Response.json } };
      if (name === "@/lib/auth") return { getSession: async (app) => {
        assert.equal(app, "ye-cinema");
        return session;
      } };
      if (name === "@/lib/internet") return { internetFetch: async (...args) => {
        calls.push(args);
        return upstream;
      } };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return { GET: exports.GET, calls };
}

const params = { params: Promise.resolve({ path: ["t", "p", "w342", "poster.jpg"] }) };
const forgedRequest = () => new Request("https://cinema.example/api/tmdb/image/t/p/w342/poster.jpg?userId=victim", {
  headers: { "X-YouEye-User": "victim" },
});

test("artwork refuses an absent or rejected session without contacting the provider", async () => {
  const { GET, calls } = imageRoute(null);
  const response = await GET(forgedRequest(), params);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
  assert.equal(calls.length, 0);
});

test("artwork uses the validated acting user and cannot persist across account changes", async () => {
  const { GET, calls } = imageRoute({ userId: "validated-user" });
  const response = await GET(forgedRequest(), params);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/jpeg");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(await response.text(), "jpeg");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "https://image.tmdb.org/t/p/w342/poster.jpg");
  assert.equal(calls[0][1].cache, "no-store");
  assert.equal(calls[0][2], "validated-user");
});

test("upstream denial remains a failed artwork response", async () => {
  const { GET } = imageRoute({ userId: "validated-user" }, new Response("Denied", { status: 403 }));
  const response = await GET(forgedRequest(), params);
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Failed to fetch image" });
});

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : entry.name.endsWith(".tsx") ? [join(dir, entry.name)] : []);
}

test("every protected Next Image consumer bypasses the sessionless optimization fetch", () => {
  const checked = new Set();
  for (const file of files(join(root, "src"))) {
    const source = readFileSync(file, "utf8");
    if (!source.includes('import Image from "next/image"') || !source.includes("/api/tmdb/image/")) continue;
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(tree) === "Image") {
        const direct = node.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.text === "unoptimized");
        assert.ok(direct && !direct.initializer, `${file}: protected artwork must use browser authentication`);
        checked.add(file);
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  for (const consumer of [
    "app/movie/[id]/page.tsx", "app/tv/[id]/page.tsx", "app/tv/[id]/season/[num]/page.tsx",
    "app/person/[id]/page.tsx", "app/watchlist/page.tsx", "app/watchlist/[id]/page.tsx",
    "app/shared/[token]/page.tsx", "components/cinema/hero-section.tsx",
    "components/cinema/movie-card.tsx", "components/cinema/person-card.tsx",
    "components/layout/header-search.tsx",
  ]) assert.ok(checked.has(join(root, "src", consumer)), `Missing artwork consumer: ${consumer}`);
});
