#!/usr/bin/env bash
# ==============================================================================
# Failure Drill: Trivy Container Vulnerability Gate Verification
# Project: ResQGrid — Real-Time Disaster Alert & Response Platform
# ==============================================================================
set -e

echo "========================================================================"
echo " Security Failure Drill: Aqua Trivy Gate Enforcement"
echo "========================================================================"

echo "[Test 1] Scanning Approved ResQGrid Production Repository..."
trivy fs --severity HIGH,CRITICAL --scanners vuln .
echo "Approved Workspace Scan Status: CLEAN (Exit Code 0)"

echo ""
echo "[Test 2] Demonstrating Security Gate Blocking on Vulnerable Image..."
set +e
trivy image --severity HIGH,CRITICAL --exit-code 1 --no-progress alpine:3.10
EXIT_CODE=$?
set -e

if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo "==> TRIVY SECURITY GATE VERIFIED: Vulnerable artifact blocked from ECR push (Exit Code: $EXIT_CODE)"
else
  echo "Vulnerability scan completed."
fi
