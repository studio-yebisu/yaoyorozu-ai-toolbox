param([Parameter(Mandatory=$true)][ValidatePattern('^[a-z0-9]+(-[a-z0-9]+)*$')][string]$CaseId)
$ErrorActionPreference='Stop'
$repoRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot
$origin=git remote get-url origin
if($LASTEXITCODE -ne 0 -or $origin -notmatch '^https://github.com/studio-yebisu/yaoyorozu-ai-toolbox(?:\.git)?$'){throw 'Unexpected publication repository.'}
$branch=git branch --show-current
if($branch -ne 'main'){throw 'Publish this approved content from the main checkout; preserve other branches.'}
$staged=git diff --cached --name-only
if($staged){throw 'Pre-existing staged changes must be handled by their owner before automatic publication.'}
$ahead=git rev-list --count origin/main..HEAD
if($LASTEXITCODE -ne 0 -or $ahead -ne '0'){throw 'Unpushed commits exist; review their scope before publishing.'}
$paths=@("data/cases/$CaseId.json","examples/$CaseId","media/$CaseId.mp4","media/$CaseId.webp")
foreach($optional in @("data/production/$CaseId.json","skills/$CaseId")){
  if(Test-Path -LiteralPath $optional){$paths+=$optional}
}
git add -- $paths
if($LASTEXITCODE -ne 0){throw 'Could not stage the publication allowlist.'}
git diff --cached --quiet
if($LASTEXITCODE -eq 1){
  git commit -m "Publish Yaoyorozu AI ToolBox case: $CaseId"
  if($LASTEXITCODE -ne 0){throw 'Commit failed.'}
}
git push origin HEAD:main
if($LASTEXITCODE -ne 0){throw 'Push failed.'}
Write-Output 'Publication pushed. Verify the Pages deployment and its actual result URL.'
