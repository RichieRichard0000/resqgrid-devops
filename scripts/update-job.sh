#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
python3 scripts/generate-security-jenkins-job.py
COOKIE_JAR="/tmp/jenkins_cookies.txt"
ADMIN_USER="${JENKINS_ADMIN_USER:-admin}"
ADMIN_PASS="${JENKINS_ADMIN_PASSWORD:-<JENKINS_ADMIN_PASSWORD>}"

if [ "${ADMIN_PASS}" = "<JENKINS_ADMIN_PASSWORD>" ]; then
  echo "Error: Please set JENKINS_ADMIN_PASSWORD environment variable before running this script." >&2
  exit 1
fi

CRUMB=$(curl -s -c "${COOKIE_JAR}" -u "${ADMIN_USER}:${ADMIN_PASS}" 'http://127.0.0.1:8080/crumbIssuer/api/json' | python3 -c "import sys, json; print(json.load(sys.stdin)['crumb'])")
echo "Crumb: ${CRUMB}"
RESPONSE=$(curl -s -b "${COOKIE_JAR}" -u "${ADMIN_USER}:${ADMIN_PASS}" -H "Jenkins-Crumb: ${CRUMB}" -H "Content-Type: application/xml" -X POST --data-binary @resqgrid-security-job.xml http://127.0.0.1:8080/job/ResQGrid-CI-CD/config.xml)
echo "=== Response ==="
echo "${RESPONSE}" | head -n 30

