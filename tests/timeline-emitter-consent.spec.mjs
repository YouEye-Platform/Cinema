import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { postAdmittedTimeline } from "../src/lib/api/timeline.ts";

const revision = "e601ca02-6c56-4bdb-a6f5-55735df464d3";
const actionTime = Date.parse("2026-10-28T12:00:00.000Z");
const cases = [
  ["emitMovieViewed", ["account-a", 1, "movie", "Title", "Overview", null, "2026", 7]],
  ["emitMovieWatched", ["account-a", 1, "movie", "Title", "Overview", null, 4, "2026", 7]],
  ["emitAddedToWatchlist", ["account-a", 1, "movie", "Title", null, "2026"]],
  ["emitStatusChange", ["account-a", 1, "movie", "Title", "watching", null, "2026"]],
  ["emitReviewPosted", ["account-a", 1, "movie", "Title", "Review", null, 4, "2026"]],
  ["emitCinemaSearch", ["account-a", "query", 3]],
];

// Execute the real emitter with only its I/O dependencies replaced. The real
// admission helper still decides whether a payload may leave the process.
function fixture(expectedEntries = 1) {
  const started = Promise.withResolvers();
  const resume = Promise.withResolvers();
  const finished = Promise.withResolvers();
  const calls = [];
  let completed = 0;
  let state = { enabled: false };
  const source = stripTypeScriptTypes(
    readFileSync(new URL("../src/lib/timeline/emit.ts", import.meta.url), "utf8")
  ).replace(/^import .+;\r?\n/gm, "").replaceAll("export async function", "async function");
  const emitters = runInNewContext(`${source}\n({${cases.map(([name]) => name).join(",")}})`, {
    Date,
    getImageUrl: () => null,
    getActivityTranslator: async userId => {
      assert.equal(userId, "account-a");
      started.resolve();
      await resume.promise;
      return { t: key => key };
    },
    createApiClient: appId => {
      assert.equal(appId, "ye-cinema");
      return {
        postTimelineEntry: async (userId, collection, entry) => {
          await postAdmittedTimeline(
            async (path, options, account) => {
              calls.push({ path, options, account });
              return path === "/timeline/collection" ? Response.json(state) : new Response(null, { status: 204 });
            }, userId, collection, entry
          );
          if (++completed === expectedEntries) finished.resolve();
        },
      };
    },
  });
  return { emitters, started, resume, finished, calls, collection: value => { state = value; } };
}

function routeFixture(path, emitters, getSession) {
  const source = stripTypeScriptTypes(
    readFileSync(new URL(`../src/app/${path}/route.ts`, import.meta.url), "utf8")
  ).replace(/^import .+;\r?\n/gm, "").replaceAll("export async function", "async function");
  const item = { id: "item-a", title: "Title", overview: "Overview", release_date: "2026-01-01", vote_average: 7 };
  return runInNewContext(`${source}\n({${path.startsWith("api/tmdb") ? "GET" : path.startsWith("api/items") ? "PUT" : "POST"}})`, {
    Date, URL, Response, console,
    NextResponse: { json: Response.json },
    getSession,
    runMigrations: async () => {},
    getOne: async () => item,
    getMany: async () => [],
    query: async () => ({ rows: [item] }),
    tmdbFetch: async () => ({ ...item, total_results: 3 }),
    ...emitters,
  });
}

const requests = [
  { name: "detail view", path: "api/tmdb/[...path]", method: "GET", params: { path: ["movie", "1"] }, entries: 1 },
  { name: "search", path: "api/tmdb/[...path]", method: "GET", params: { path: ["search", "multi"] }, entries: 1 },
  { name: "watchlist addition", path: "api/watchlists/[id]/items", method: "POST", params: { id: "watchlist-a" }, body: { tmdb_id: 1, media_type: "movie" }, entries: 1 },
  ...["watched", "watching"].map(status => ({
    name: `${status} and review`, path: "api/items/[tmdbId]", method: "PUT", params: { tmdbId: "1" },
    body: { media_type: "movie", status, review_text: "Review" }, entries: 2,
  })),
];

for (const request of requests) {
  for (const lateConsent of [true, false]) {
    test(`${request.name}: request time survives enrichment and sequential locale awaits (${lateConsent ? "late consent rejects all events" : "enabled events keep one original time"})`, { timeout: 5000 }, async context => {
      context.mock.timers.enable({ apis: ["Date"], now: actionTime });
      const f = fixture(request.entries);
      const admitted = Promise.withResolvers();
      const auth = Promise.withResolvers();
      const handler = routeFixture(request.path, f.emitters, async app => {
        assert.equal(app, "ye-cinema");
        admitted.resolve();
        await auth.promise;
        return { userId: "account-a" };
      });
      if (!lateConsent) f.collection({ enabled: true, revision, enabledAt: new Date(actionTime - 1000).toISOString() });
      const pending = handler[request.method](new Request("https://cinema.example/api/action?query=test", {
        method: request.method,
        ...(request.body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(request.body) } : {}),
      }), { params: Promise.resolve(request.params) });
      await admitted.promise;
      context.mock.timers.tick(500);
      auth.resolve();
      await f.started.promise;
      context.mock.timers.tick(1000);
      if (lateConsent) f.collection({ enabled: true, revision, enabledAt: new Date().toISOString() });
      f.resume.resolve();
      assert.ok((await pending).ok);
      await f.finished.promise;
      const posts = f.calls.filter(call => call.path === "/timeline");
      assert.equal(posts.length, lateConsent ? 0 : request.entries);
      assert.equal(f.calls.filter(call => call.path === "/timeline/collection").length, request.entries);
      for (const call of f.calls) assert.equal(call.account, "account-a");
      for (const call of posts) {
        const payload = JSON.parse(call.options.body);
        assert.equal(payload.timestamp, new Date(actionTime).toISOString());
        assert.equal(payload.collection_revision, revision);
      }
    });
  }
}

for (const [name, args] of cases) {
  test(`${name}: a locale delay cannot move an off-period action into newly enabled collection`, async context => {
    context.mock.timers.enable({ apis: ["Date"], now: actionTime });
    const f = fixture();
    const pending = f.emitters[name](...args);
    await f.started.promise;
    context.mock.timers.tick(1000);
    f.collection({ enabled: true, revision, enabledAt: new Date().toISOString() });
    f.resume.resolve();
    await pending;
    assert.equal(f.calls.length, 1, "no Timeline POST after late consent");
    assert.equal(f.calls[0].path, "/timeline/collection");
    assert.equal(f.calls[0].options.cache, "no-store");
    assert.equal(f.calls[0].account, "account-a");
    assert.equal(f.calls[0].options.body, undefined);
  });

  test(`${name}: enabled activity retains its timestamp across locale lookup`, async context => {
    context.mock.timers.enable({ apis: ["Date"], now: actionTime });
    const f = fixture();
    f.collection({ enabled: true, revision, enabledAt: new Date(actionTime - 1000).toISOString() });
    const pending = f.emitters[name](...args);
    await f.started.promise;
    context.mock.timers.tick(2000);
    f.resume.resolve();
    await pending;
    assert.equal(f.calls.length, 2);
    assert.equal(f.calls[1].path, "/timeline");
    assert.equal(f.calls[1].account, "account-a");
    const payload = JSON.parse(f.calls[1].options.body);
    assert.equal(payload.timestamp, new Date(actionTime).toISOString());
    assert.equal(payload.collection_revision, revision);
    assert.equal(payload.collection, "history");
  });

  test(`${name}: an earlier caller timestamp is not replaced by emitter time`, async context => {
    context.mock.timers.enable({ apis: ["Date"], now: actionTime });
    const f = fixture();
    f.collection({ enabled: true, revision, enabledAt: new Date(actionTime - 2000).toISOString() });
    const original = new Date(actionTime - 1000).toISOString();
    const pending = f.emitters[name](...args, original);
    f.resume.resolve();
    await pending;
    assert.equal(f.calls.length, 2);
    assert.equal(JSON.parse(f.calls[1].options.body).timestamp, original);
  });

  test(`${name}: a caller timestamp before the collection interval remains rejected`, async context => {
    context.mock.timers.enable({ apis: ["Date"], now: actionTime });
    const f = fixture();
    f.collection({ enabled: true, revision, enabledAt: new Date(actionTime - 1000).toISOString() });
    const pending = f.emitters[name](...args, new Date(actionTime - 2000).toISOString());
    f.resume.resolve();
    await pending;
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].path, "/timeline/collection");
  });
}
