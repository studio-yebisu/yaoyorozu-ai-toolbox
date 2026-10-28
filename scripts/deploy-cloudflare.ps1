$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $repoRoot
$envNames = @('YAOYOROZU_SITE_URL', 'YAOYOROZU_LIKES_API_URL', 'YAOYOROZU_R2_BUCKET')
$previousEnv = @{}
foreach ($name in $envNames) { $previousEnv[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
    $origin = git remote get-url origin
    if ($LASTEXITCODE -ne 0 -or $origin -notmatch '^https://github.com/studio-yebisu/yaoyorozu-ai-toolbox(?:\.git)?$') { throw 'Unexpected publication repository.' }
    $branch = git branch --show-current
    if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') { throw 'Deploy the approved, merged main branch.' }
    $dirty = git status --porcelain --untracked-files=all
    if ($LASTEXITCODE -ne 0 -or $dirty) { throw 'Public source has uncommitted work. Preserve it and deploy from a clean main checkout.' }
    $commit = git rev-parse HEAD
    $remote = git ls-remote --heads origin main
    if ($LASTEXITCODE -ne 0 -or $remote -notmatch ('^' + [regex]::Escape($commit) + '\s+refs/heads/main$')) { throw 'Local main and published main differ; reconcile them before deploying.' }

    # Pages retains original URLs and oversized fallback files. Wait for that
    # exact approved commit before publishing references from Cloudflare.
    $run = $null
    for ($attempt = 0; $attempt -lt 10; $attempt++) {
        $raw = gh run list --repo studio-yebisu/yaoyorozu-ai-toolbox --workflow pages.yml --commit $commit --limit 1 --json databaseId
        if ($LASTEXITCODE -ne 0) { throw 'Could not inspect the Pages deployment.' }
        $runs = @($raw | ConvertFrom-Json)
        if ($runs.Count -gt 0) { $run = $runs[0].databaseId; break }
        Start-Sleep -Seconds 2
    }
    if (-not $run) { throw 'Pages has not registered this commit yet. Retry after its workflow starts.' }
    gh run watch $run --repo studio-yebisu/yaoyorozu-ai-toolbox --exit-status --interval 10 --compact
    if ($LASTEXITCODE -ne 0) { throw 'The matching Pages deployment failed; Cloudflare was not changed.' }

    $settings = Get-Content -LiteralPath 'services/site/deployment.json' -Raw | ConvertFrom-Json
    $env:YAOYOROZU_SITE_URL = $settings.site_url
    $env:YAOYOROZU_LIKES_API_URL = $settings.likes_api_url
    if ($settings.r2_bucket) { $env:YAOYOROZU_R2_BUCKET = $settings.r2_bucket }
    else { Remove-Item -LiteralPath 'Env:YAOYOROZU_R2_BUCKET' -ErrorAction SilentlyContinue }
    if (-not (Test-Path -LiteralPath 'node_modules/cf/package.json')) {
        npm ci --ignore-scripts --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'Cloudflare dependency installation failed.' }
    }
    python scripts/build.py
    if ($LASTEXITCODE -ne 0) { throw 'Site build failed.' }
    python scripts/check.py
    if ($LASTEXITCODE -ne 0) { throw 'Site validation failed.' }
    npm test
    if ($LASTEXITCODE -ne 0) { throw 'Cloudflare regression checks failed.' }
    npm run prepare:cf
    if ($LASTEXITCODE -ne 0) { throw 'Cloudflare packaging failed.' }
    $dirty = git status --porcelain --untracked-files=all
    $remote = git ls-remote --heads origin main
    if ($dirty -or $LASTEXITCODE -ne 0 -or $remote -notmatch ('^' + [regex]::Escape($commit) + '\s+refs/heads/main$')) { throw 'Source changed during preparation; rebuild the current approved main.' }
    npm run deploy:cf -- --provision false --message $commit
    if ($LASTEXITCODE -ne 0) { throw 'Cloudflare deployment failed; inspect the CLI result before retrying.' }
    $expected = Get-Content -LiteralPath '.local/cloudflare-release-report.json' -Raw | ConvertFrom-Json
    $health = $null
    for ($attempt = 0; $attempt -lt 5; $attempt++) {
        try { $health = Invoke-RestMethod -Uri ($settings.site_url.TrimEnd('/') + '/healthz') -TimeoutSec 30 }
        catch { $health = $null }
        if ($health -and $health.ok -and $health.revision -eq $expected.worker.revision) { break }
        Start-Sleep -Seconds 2
    }
    if (-not $health -or -not $health.ok -or $health.revision -ne $expected.worker.revision) { throw 'The public health revision does not match the prepared deployment.' }
    Write-Output ('Cloudflare health verified: ' + $settings.site_url + ' revision=' + $health.revision)
}
finally {
    foreach ($name in $envNames) { [Environment]::SetEnvironmentVariable($name, $previousEnv[$name], 'Process') }
    Pop-Location
}
