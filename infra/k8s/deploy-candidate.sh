#!/usr/bin/env bash
# ==============================================================================
# ResQGrid Blue-Green Release Orchestrator
# Project: ResQGrid — Real-Time Disaster Alert & Response Platform
# Principle: Zero production disruption with pre-promotion smoke tests & instant rollback
# ==============================================================================
set -euo pipefail

NAMESPACE="${K8S_NAMESPACE:-resqgrid}"
IMAGE_TAG="${1:-resqgrid-backend:latest}"
GIT_COMMIT="${2:-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"
SMOKE_URL="${SMOKE_TEST_URL:-http://localhost:4000}"

echo "========================================================================"
echo " Starting ResQGrid Blue-Green Deployment"
echo " Image:      ${IMAGE_TAG}"
echo " Git Commit: ${GIT_COMMIT}"
echo " Namespace:  ${NAMESPACE}"
echo "========================================================================"

# Step 1: Query current active color from production service selector
CURRENT_ACTIVE=$(kubectl get service backend-service -n "${NAMESPACE}" -o jsonpath='{.spec.selector.release}' 2>/dev/null || echo "blue")

if [ -z "${CURRENT_ACTIVE}" ]; then
  CURRENT_ACTIVE="blue"
fi

if [ "${CURRENT_ACTIVE}" = "blue" ]; then
  CANDIDATE_COLOR="green"
else
  CANDIDATE_COLOR="blue"
fi

echo "[1/6] Current ACTIVE release:    ${CURRENT_ACTIVE}"
echo "[1/6] Target CANDIDATE release: ${CANDIDATE_COLOR}"

# Step 2: Deploy approved immutable image to inactive candidate environment
echo "[2/6] Updating candidate Deployment: backend-${CANDIDATE_COLOR}..."
kubectl set image "deployment/backend-${CANDIDATE_COLOR}" "backend=${IMAGE_TAG}" -n "${NAMESPACE}"
kubectl set env "deployment/backend-${CANDIDATE_COLOR}" "RELEASE_COLOR=${CANDIDATE_COLOR}" "RELEASE_COMMIT=${GIT_COMMIT}" -n "${NAMESPACE}"

# Step 3: Point candidate testing service to candidate color
echo "[3/6] Aligning backend-candidate-service selector to ${CANDIDATE_COLOR}..."
kubectl patch service backend-candidate-service -n "${NAMESPACE}" -p "{\"spec\":{\"selector\":{\"release\":\"${CANDIDATE_COLOR}\"}}}"

# Step 4: Wait for candidate pods to become Ready
echo "[4/6] Waiting for candidate deployment rollout..."
if ! kubectl rollout status "deployment/backend-${CANDIDATE_COLOR}" -n "${NAMESPACE}" --timeout=120s; then
  echo "ERROR: Candidate deployment rollout timed out or failed!"
  echo "Production service remains safely pointing to ${CURRENT_ACTIVE}."
  exit 1
fi

# Step 5: Execute Pre-Promotion Smoke Tests against candidate
echo "[5/6] Executing automated smoke tests against candidate environment..."
if command -v k6 &>/dev/null; then
  if ! k6 run --env TARGET_URL="${SMOKE_URL}" --env EXPECTED_COLOR="${CANDIDATE_COLOR}" --env EXPECTED_COMMIT="${GIT_COMMIT}" infra/load-tests/smoke-test.js; then
    echo "========================================================================"
    echo " CRITICAL: Candidate smoke tests FAILED!"
    echo " PROMOTION ABORTED: Production service still points to ${CURRENT_ACTIVE}."
    echo "========================================================================"
    exit 1
  fi
else
  echo "k6 CLI not detected; performing native HTTP smoke test verification via curl..."
  STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${SMOKE_URL}/health/ready" || echo "000")
  REL_COLOR=$(curl -s "${SMOKE_URL}/health/version" | grep -o "\"color\":\"[^\"]*\"" | cut -d'"' -f4 || echo "")
  if [ "${STATUS_CODE}" != "200" ] || [ "${REL_COLOR}" != "${CANDIDATE_COLOR}" ]; then
    echo "Candidate HTTP verification failed! Status: ${STATUS_CODE}, Color: ${REL_COLOR}"
    exit 1
  fi
fi

# Step 6: Atomic Production Traffic Switch
echo "[6/6] All checks PASSED! Switching production Service to ${CANDIDATE_COLOR}..."
kubectl patch service backend-service -n "${NAMESPACE}" -p "{\"spec\":{\"selector\":{\"release\":\"${CANDIDATE_COLOR}\"}}}"
kubectl patch service backend -n "${NAMESPACE}" -p "{\"spec\":{\"selector\":{\"release\":\"${CANDIDATE_COLOR}\"}}}" 2>/dev/null || true

# Update HPA target to the newly promoted active deployment
kubectl patch hpa backend-hpa -n "${NAMESPACE}" -p "{\"spec\":{\"scaleTargetRef\":{\"name\":\"backend-${CANDIDATE_COLOR}\"}}}" 2>/dev/null || true

echo "========================================================================"
echo " Blue-Green Promotion Completed Successfully!"
echo " Previous Release:  ${CURRENT_ACTIVE} (Retained during verification window)"
echo " Promoted Release:  ${CANDIDATE_COLOR}"
echo " Active Image Tag:  ${IMAGE_TAG}"
echo " Verification Time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "========================================================================"
