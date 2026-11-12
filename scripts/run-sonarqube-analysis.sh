#!/usr/bin/env bash
# ==============================================================================
# SonarQube Scanner Execution & Quality Gate Script
# Project: ResQGrid — Real-Time Disaster Alert & Response Platform
# ==============================================================================
set -euo pipefail

echo "=================================================="
echo "  Executing SonarQube Static Code Analysis (SAST)"
echo "=================================================="

SONAR_HOST_URL="${SONAR_HOST_URL:-http://localhost:9000}"
SONAR_PROJECT_KEY="${SONAR_PROJECT_KEY:-resqgrid}"

echo "Target SonarQube Host: ${SONAR_HOST_URL}"
echo "Project Key:           ${SONAR_PROJECT_KEY}"
echo "Config File:           sonar-project.properties"

# Verify test reports exist before analysis
test -f backend/junit.xml && echo "Found backend/junit.xml test execution report."
test -f frontend/junit.xml && echo "Found frontend/junit.xml test execution report."

# Execute static analysis
echo "Scanning source code for bugs, code smells, and security vulnerabilities..."
if command -v sonar-scanner &> /dev/null; then
    sonar-scanner -Dsonar.host.url="${SONAR_HOST_URL}"
else
    echo "Running analysis via containerized sonarsource/sonar-scanner-cli..."
    docker run --rm \
      --network host \
      -v "$(pwd):/usr/src" \
      sonarsource/sonar-scanner-cli:latest \
      -Dsonar.host.url="${SONAR_HOST_URL}"
fi

echo "=== SonarQube Static Analysis Completed Successfully ==="
