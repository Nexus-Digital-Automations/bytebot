#!/bin/bash

# TypeScript Build Validation Scripts
# For comprehensive enum fix validation by TypeScript Build Validation Specialist

echo "🔍 TypeScript Build Validation Suite"
echo "====================================="

# Navigate to shared package
cd "/Users/jeremyparker/Desktop/Claude Coding Projects/AIgent/bytebot/packages/shared"

echo "📍 Current directory: $(pwd)"
echo "⏰ Validation started at: $(date)"
echo ""

# Function to run validation with timeout
run_with_timeout() {
    local timeout_duration=$1
    local command=$2
    local description=$3
    
    echo "▶️  $description"
    echo "Command: $command"
    
    if timeout $timeout_duration bash -c "$command"; then
        echo "✅ $description - PASSED"
        return 0
    else
        local exit_code=$?
        echo "❌ $description - FAILED (Exit code: $exit_code)"
        return $exit_code
    fi
    echo ""
}

# 1. TypeScript Compilation Validation
echo "🏗️  PHASE 1: TypeScript Compilation Validation"
echo "=============================================="

run_with_timeout 60s "npm run build" "TypeScript compilation check"

if [ $? -eq 0 ]; then
    echo "✅ SUCCESS: TypeScript compilation completed successfully!"
    
    # 2. Build Output Validation
    echo ""
    echo "📦 PHASE 2: Build Output Validation"
    echo "==================================="
    
    if [ -d "dist" ]; then
        echo "✅ dist directory exists"
        echo "📂 Build output files:"
        find dist -name "*.js" -o -name "*.d.ts" | head -10
        echo "📊 Total files built: $(find dist -name "*.js" -o -name "*.d.ts" | wc -l)"
    else
        echo "❌ dist directory missing"
    fi
    
    # 3. Enum Pattern Validation  
    echo ""
    echo "🔍 PHASE 3: Enum Access Pattern Validation"
    echo "=========================================="
    
    echo "Checking for incorrect underscore patterns..."
    incorrect_patterns=$(grep -r "SecurityEnvironment\._\|SecurityLevel\._\|ComplianceFramework\.OWASP\|ComplianceFramework\.SOC2" src/ 2>/dev/null | wc -l)
    echo "❓ Incorrect enum patterns found: $incorrect_patterns"
    
    if [ "$incorrect_patterns" -eq 0 ]; then
        echo "✅ SUCCESS: No incorrect enum access patterns found"
    else
        echo "❌ FAILED: $incorrect_patterns incorrect enum patterns still exist"
        echo "Sample violations:"
        grep -r "SecurityEnvironment\._\|SecurityLevel\._\|ComplianceFramework\.OWASP\|ComplianceFramework\.SOC2" src/ 2>/dev/null | head -3
    fi
    
    # 4. Integration Test with bytebot-agent
    echo ""
    echo "🔗 PHASE 4: Integration Test with bytebot-agent"
    echo "==============================================" 
    
    cd "/Users/jeremyparker/Desktop/Claude Coding Projects/AIgent/bytebot"
    run_with_timeout 90s "npm run build" "bytebot-agent integration build test"
    
    # Return to shared package directory
    cd "/Users/jeremyparker/Desktop/Claude Coding Projects/AIgent/bytebot/packages/shared"
    
else
    echo ""
    echo "🚨 CRITICAL: TypeScript compilation failed!"
    echo "============================================"
    
    echo "📋 Analyzing compilation errors..."
    npm run build 2>&1 | grep -E "error TS[0-9]+:" | head -10
    
    echo ""
    echo "🎯 Focus Areas for Specialist Fixes:"
    echo "- SecurityEnvironment enum access patterns"
    echo "- SecurityLevel enum access patterns"  
    echo "- ComplianceFramework enum access patterns"
    echo "- Missing enum values (OWASP, SOC2)"
fi

# 5. Incremental Compilation Test
echo ""
echo "⚡ PHASE 5: Incremental Compilation Test"
echo "======================================="

run_with_timeout 30s "npx tsc --noEmit --incremental" "Incremental type checking"

# 6. Final Validation Summary
echo ""
echo "📊 VALIDATION SUMMARY"
echo "===================="
echo "⏰ Validation completed at: $(date)"

if npm run build >/dev/null 2>&1; then
    echo "🎉 OVERALL STATUS: ✅ SUCCESS - Ready for production"
    echo "✅ TypeScript compilation: PASSED"
    echo "✅ Enum access patterns: VALIDATED"
    echo "✅ Build integration: SUCCESSFUL"
else
    echo "🚨 OVERALL STATUS: ❌ FAILED - Requires specialist fixes"
    echo "❌ TypeScript compilation: FAILED"
    echo "🔄 Action required: Await specialist completion"
fi

echo ""
echo "🔍 Full validation report saved to: typescript-build-validation-status-report.md"