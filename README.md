# civ-bench-marketing

The public CivBench site — the open leaderboard for public-sector LLM evals. Built with Astro 7 + Tailwind CSS v4, deployed as a static site to S3 + CloudFront via SST v3.

## What's here

- `src/pages/` — home, leaderboard, methodology, categories, contamination policy, founding argument
- `src/data/results.json` — leaderboard rows (currently **sample data** for design; replaced by real runs before publishing)
- `src/data/categories.json` — the 18 eval categories (mirrors the eval repo)
- `scripts/ingest.mjs` — converts the eval runner's JSONL output into leaderboard rows
- `sst.config.ts` — SST v3 app deploying the static site to CloudFront/S3

## Publishing new scores

1. In the eval repo, run the benchmark:
   `python scripts/run_evals.py --model-name <id> --out run.jsonl`
2. Ingest into this site's data:
   `node scripts/ingest.mjs run.jsonl --model <id> --vendor <name>`
3. Rebuild and redeploy (below).

The ingest script refuses to overwrite sample rows without `--force`, so the placeholder data can't be silently shipped.

## Local dev

```bash
npm install
npm run dev     # http://localhost:4321
npm run build   # static output in dist/
```

## Deploy

Deploys are manual — the site goes out only on a human's explicit say-so.

```bash
npm run deploy                # dev stage
npm run deploy:production     # production stage (protected, retained)
```

Requires AWS credentials configured for SST (`home: "aws"` in `sst.config.ts`). First deploy creates the S3 bucket + CloudFront distribution; the URL is printed as the `url` output.

## Design notes

- Editorial light theme: paper background, ink text, serif headlines. Trustworthy, not SaaS-generic.
- Leaderboard table sorts client-side (score / cost / model); category breakdowns expand per row.
- The score-vs-cost scatter with the Pareto frontier is rendered at build time as inline SVG — no chart library, no client JS.
- One inline `<script is:inline>` on the leaderboard page (Astro hoists plain inline scripts into separate modules, so shared globals need `is:inline`).
