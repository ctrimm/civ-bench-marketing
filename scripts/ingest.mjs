#!/usr/bin/env node
/**
 * Ingest runner JSONL into the leaderboard's results.json.
 *
 * The eval repo's runner writes one JSON object per fixture per run:
 *   { fixture_id, category, scorer, status, model, latency_s,
 *     input_tokens, output_tokens, cost_usd, ... }
 *
 * This script aggregates one or more run files into a per-model row:
 * overall pass rate, cost per task, and per-category pass rates.
 *
 * Usage:
 *   node scripts/ingest.mjs evals/results/run-20261008T120000Z.jsonl --model claude-sonnet-4-5 --vendor Anthropic
 *
 * The script MERGES into src/data/results.json (matching on model id),
 * so repeated runs accumulate into the leaderboard. Rows it writes are
 * real data — it refuses to overwrite rows still carrying the sample-data
 * marker unless --force is passed.
 */
import { readFileSync, writeFileSync } from "node:fs";

const [runFile, ...rest] = process.argv.slice(2);
if (!runFile) {
  console.error("usage: node scripts/ingest.mjs <run.jsonl> --model <id> --vendor <name> [--force]");
  process.exit(1);
}
const args = Object.fromEntries(
  rest.flatMap((a, i) => (a.startsWith("--") ? [[a.slice(2), rest[i + 1]]] : []))
);
const model = args.model;
const vendor = args.vendor ?? "unknown";
if (!model) {
  console.error("--model is required");
  process.exit(1);
}

const records = readFileSync(runFile, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));

const scored = records.filter((r) => r.status === "PASS" || r.status === "FAIL");
const byCat = {};
for (const r of scored) {
  (byCat[r.category] ??= { pass: 0, n: 0 });
  byCat[r.category].n += 1;
  if (r.status === "PASS") byCat[r.category].pass += 1;
}
const categories = Object.fromEntries(
  Object.entries(byCat).map(([c, v]) => [c, Math.round((v.pass / v.n) * 100) / 100])
);
const overall = Math.round((scored.filter((r) => r.status === "PASS").length / scored.length) * 100) / 100;
const costs = scored.map((r) => r.cost_usd).filter((c) => typeof c === "number");
const costPerTask = costs.length
  ? Math.round((costs.reduce((a, b) => a + b, 0) / costs.length) * 1000) / 1000
  : null;

const resultsPath = new URL("../src/data/results.json", import.meta.url);
const results = JSON.parse(readFileSync(resultsPath, "utf8"));
const idx = results.runs.findIndex((r) => r.model === model);
const row = {
  model, vendor, overall, cost_per_task_usd: costPerTask, categories,
  provisional: false,
  judge: "see run file",
  notes: `Ingested from ${runFile}; ${scored.length} fixtures scored.`,
  updated: new Date().toISOString().slice(0, 10),
};
if (idx >= 0) {
  if (results.runs[idx].notes?.includes("Sample data") && !rest.includes("--force")) {
    console.error(`Refusing to overwrite sample row for ${model} without --force`);
    process.exit(1);
  }
  results.runs[idx] = row;
} else {
  results.runs.push(row);
}
results.updated = row.updated;
writeFileSync(resultsPath, JSON.stringify(results, null, 2) + "\n");
console.log(`ingested ${scored.length} fixtures for ${model}: overall=${overall}, $/task=${costPerTask}`);
