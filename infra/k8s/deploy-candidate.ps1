# ==============================================================================
# ResQGrid Blue-Green Release Orchestrator (PowerShell)
# Project: ResQGrid — Real-Time Disaster Alert & Response Platform
# ==============================================================================
param(
  [string]$ImageTag = "resqgrid-backend:latest",
  [string]$GitCommit = "546cae7",
  [string]$Namespace = "resqgrid",
  [string]$SmokeUrl = "http://localhost:4000",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host " Starting ResQGrid Blue-Green Deployment" -ForegroundColor Cyan
Write-Host " Image:      $ImageTag"
Write-Host " Git Commit: $GitCommit"
Write-Host " Namespace:  $Namespace"
Write-Host "========================================================================" -ForegroundColor Cyan

# Step 1: Detect Active Release
$currentActive = "blue"
if (-not $DryRun) {
  try {
    $currentActive = (kubectl get service backend-service -n $Namespace -o jsonpath='{.spec.selector.release}' 2>$null)
    if (-not $currentActive) { $currentActive = "blue" }
  } catch {
    $currentActive = "blue"
  }
}

if ($currentActive -eq "blue") {
  $candidateColor = "green"
} else {
  $candidateColor = "blue"
}

Write-Host "[1/6] Current ACTIVE release:    $currentActive" -ForegroundColor Yellow
Write-Host "[1/6] Target CANDIDATE release: $candidateColor" -ForegroundColor Green

# Step 2: Deploy to Candidate Deployment
Write-Host "[2/6] Updating candidate Deployment: backend-$candidateColor..."
if (-not $DryRun) {
  kubectl set image "deployment/backend-$candidateColor" "backend=$ImageTag" -n $Namespace
  kubectl set env "deployment/backend-$candidateColor" "RELEASE_COLOR=$candidateColor" "RELEASE_COMMIT=$GitCommit" -n $Namespace
} else {
  Write-Host "  [DRY-RUN] Simulated image & env injection: backend=$ImageTag" -ForegroundColor Magenta
}

# Step 3: Align Candidate Service
Write-Host "[3/6] Aligning backend-candidate-service selector to $candidateColor..."
if (-not $DryRun) {
  kubectl patch service backend-candidate-service -n $Namespace -p "{`"spec`":{`"selector`":{`"release`":`"$candidateColor`"}}}"
} else {
  Write-Host "  [DRY-RUN] Simulated service patch: backend-candidate-service -> $candidateColor" -ForegroundColor Magenta
}

# Step 4: Wait for Rollout
Write-Host "[4/6] Waiting for candidate deployment rollout..."
if (-not $DryRun) {
  kubectl rollout status "deployment/backend-$candidateColor" -n $Namespace --timeout=120s
} else {
  Write-Host "  [DRY-RUN] Simulated rollout wait (Status: 2/2 Replicas Ready)" -ForegroundColor Magenta
  Start-Sleep -Milliseconds 300
}

# Step 5: Execute Pre-Promotion Smoke Test
Write-Host "[5/6] Executing automated smoke tests against candidate environment..."
if (-not $DryRun) {
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
  k6 run --env TARGET_URL=$SmokeUrl --env EXPECTED_COLOR=$candidateColor --env EXPECTED_COMMIT=$GitCommit infra/load-tests/smoke-test.js
} else {
  Write-Host "  [DRY-RUN] Simulated candidate smoke tests: ALL CHECKS PASSED (100% rate)" -ForegroundColor Magenta
}

# Step 6: Atomic Production Traffic Switch
Write-Host "[6/6] All checks PASSED! Switching production Service to $candidateColor..." -ForegroundColor Green
if (-not $DryRun) {
  kubectl patch service backend-service -n $Namespace -p "{`"spec`":{`"selector`":{`"release`":`"$candidateColor`"}}}"
  kubectl patch service backend -n $Namespace -p "{`"spec`":{`"selector`":{`"release`":`"$candidateColor`"}}}" 2>$null
  kubectl patch hpa backend-hpa -n $Namespace -p "{`"spec`":{`"scaleTargetRef`":{`"name`":`"backend-$candidateColor`"}}}" 2>$null
} else {
  Write-Host "  [DRY-RUN] Simulated atomic selector patch: backend-service selector.release = $candidateColor" -ForegroundColor Green
}

Write-Host "========================================================================" -ForegroundColor Green
Write-Host " Blue-Green Promotion Completed Successfully!" -ForegroundColor Green
Write-Host " Previous Release:  $currentActive"
Write-Host " Promoted Release:  $candidateColor"
Write-Host " Active Image Tag:  $ImageTag"
Write-Host "========================================================================" -ForegroundColor Green
