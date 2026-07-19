#!/bin/bash
set -e

echo "=== Bond Issuance QA Test Suite ==="
echo "Checking if application stack is running..."

if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/system/date | grep -q "200"; then
  echo "Backend not reachable at localhost:8080."
  echo "Please run 'docker compose up -d' first and wait for the stack to be ready."
  exit 1
fi

echo "Backend is reachable. Running test suite..."
echo ""

npx cucumber-js

echo ""
echo "=== Test run complete ==="
echo "HTML report: reports/cucumber-report.html"
echo "JSON report: reports/cucumber-report.json"
