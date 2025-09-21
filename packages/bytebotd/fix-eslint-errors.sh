#!/bin/bash

# Fix common ESLint parsing errors in bytebotd package
echo "Fixing ESLint parsing errors in bytebotd package..."

# Fix missing commas before async in test files
echo "Fixing missing commas before async..."
find src -name "*.ts" -type f -exec sed -i '' "s/it('.*'async (/&,/g" {} \;
find src -name "*.ts" -type f -exec sed -i '' "s/describe('.*'async (/&,/g" {} \;
find src -name "*.ts" -type f -exec sed -i '' "s/test('.*'async (/&,/g" {} \;

# Fix concatenated statements (join lines without proper spacing)
echo "Fixing concatenated statements..."
find src -name "*.ts" -type f -exec sed -i '' "s/};securityLogger\./};\
      securityLogger\./g" {} \;
find src -name "*.ts" -type f -exec sed -i '' "s/);const /); \
      const /g" {} \;
find src -name "*.ts" -type f -exec sed -i '' "s/`;const /\`; \
      const /g" {} \;

# Fix property assignment issues in object literals
echo "Fixing property assignment issues..."
find src -name "*.ts" -type f -exec sed -i '' "s/{ mockWs:/{ mockWs: /g" {} \;
find src -name "*.ts" -type f -exec sed -i '' "s/{ sessionId:/{ sessionId: /g" {} \;

echo "ESLint error fixes completed. Running lint to verify..."