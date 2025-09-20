#!/bin/bash
# Fix RiskLevel enum property access issues

echo "Fixing RiskLevel enum property access issues across the codebase..."

# Find all TypeScript files and fix RiskLevel.CRITICAL and RiskLevel.HIGH
find src -name "*.ts" -type f -exec sed -i '' 's/RiskLevel\.CRITICAL/RiskLevel._CRITICAL/g' {} \;
find src -name "*.ts" -type f -exec sed -i '' 's/RiskLevel\.HIGH/RiskLevel._HIGH/g' {} \;

echo "RiskLevel fixes applied to all TypeScript files."
echo "Files modified:"
find src -name "*.ts" -exec grep -l "RiskLevel\._\(CRITICAL\|HIGH\)" {} \;