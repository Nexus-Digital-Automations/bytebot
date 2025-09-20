#!/bin/bash

# Script to fix malformed imports in security files

# Array of security files to fix
files=(
  "src/security/security-audit.service.ts"
  "src/security/security-monitoring.service.ts"
  "src/security/security-policy-validator.service.ts"
  "src/security/security-threat-detector.service.ts"
)

for file in "${files[@]}"; do
  echo "Fixing imports in $file..."

  # Fix the malformed import block pattern
  sed -i.bak 's/import { Injectable, Logger } from '\''@nestjs\/common'\'';import { ConfigService } from '\''@nestjs\/config'\'';import { ParlantIntegrationService,/import { Injectable, Logger } from '\''@nestjs\/common'\'';\
import { ConfigService } from '\''@nestjs\/config'\'';\
import { ParlantIntegrationService,/g' "$file"

  # Fix the closing of import block and interface comment
  sed -i.bak 's/} from '\''\.\.\/parlant\/parlant-integration\.service'\'';\/\/ =====/} from '\''\.\.\/parlant\/parlant-integration\.service'\'';\
\
\/\/ =====/g' "$file"

  # Clean up backup files
  rm -f "$file.bak"

  echo "Fixed imports in $file"
done

echo "All security file imports fixed!"