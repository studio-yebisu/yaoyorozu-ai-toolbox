import {defineConfig, defineWorker} from 'cf/config'

// Intent mirror of the prebuilt deploy contract written by
// scripts/prepare_cloudflare.mjs. Deployment consumes
// .cloudflare/output/v0/ via `cf deploy --prebuilt --mode production`;
// this file expresses the same Worker in cf config shapes for tooling and
// type generation. Keep both in sync when these settings change.
//
// Optional R2 media mode: set YAOYOROZU_R2_BUCKET to the name of an existing
// bucket (the release owner uploads and verifies the objects separately) to
// bind it as MEDIA and serve the oversized files from R2 instead of
// redirecting them to GitHub Pages. Unset keeps the fallback exactly as-is.
const r2Bucket = (process.env.YAOYOROZU_R2_BUCKET || '').trim()

export default defineConfig({
  accountId: 'b9a279130afe8c02e3c6f32c3f3ac43a',
  worker: defineWorker({
    name: 'yaoyorozu-ai-toolbox',
    compatibilityDate: '2026-10-28',
    entrypoint: 'services/site/worker.mjs',
    workersDev: true,
    assets: {htmlHandling: 'auto-trailing-slash', notFoundHandling: 'none'},
    observability: {
      enabled: true,
      logs: {enabled: true, headSamplingRate: 0.1},
      traces: {enabled: true, headSamplingRate: 0.05}
    },
    env: {
      ASSETS: {type: 'assets'},
      ...(r2Bucket ? {MEDIA: {type: 'r2' as const, name: r2Bucket}} : {})
    }
  })
})
