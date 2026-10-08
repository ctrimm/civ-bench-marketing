/// <reference path="./.sst/platform/config.d.ts" />

/**
 * civ-bench-marketing — the public CivBench leaderboard site.
 *
 * Static Astro site on S3 + CloudFront via SST v3.
 *
 *   npm run deploy                  # dev stage (your AWS account)
 *   npm run deploy:production       # production stage
 *
 * The site is fully static: leaderboard data lives in
 * src/data/results.json and is baked in at build time. To publish new
 * scores, update results.json (via scripts/ingest.mjs from the eval
 * repo's runner JSONL) and redeploy.
 */
export default $config({
  app(input) {
    return {
      name: "civ-bench-marketing",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    const site = new sst.aws.Astro("Site", {
      path: ".",
    });
    return { url: site.url };
  },
});
