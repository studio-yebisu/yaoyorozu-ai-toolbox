/* Entry point for the yaoyorozu-ai-toolbox site Worker.
 *
 * scripts/prepare_cloudflare.mjs copies this file and handler.mjs into the
 * Build Output bundle (workers/default/bundle/) next to the generated
 * remote-assets.mjs module, so the relative imports below resolve at deploy
 * time. The generated module carries the deployment revision, the canonical
 * origin, and the media manifest: in the default GitHub Pages fallback mode
 * REMOTE_ASSETS lists large files that 307-redirect, while in R2 media mode
 * (R2_BUCKET set by YAOYOROZU_R2_BUCKET) R2_KEYS allowlists the exact bucket
 * objects the Worker serves via env.MEDIA.
 */
import {REMOTE_ASSETS, R2_BUCKET, R2_KEYS, BUILD_REVISION, CANONICAL_ORIGIN} from './remote-assets.mjs';
import {createSiteHandler} from './handler.mjs';

export default createSiteHandler({
  remoteAssets: REMOTE_ASSETS,
  r2Bucket: R2_BUCKET,
  r2Keys: R2_KEYS,
  revision: BUILD_REVISION,
  canonicalOrigin: CANONICAL_ORIGIN
});
