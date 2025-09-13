# Project Task Requirements

## Success Criteria for All Feature Tasks

### Build Requirements
- [ ] `npm run build` completes without errors
- [ ] No build warnings or failures

### Runtime Requirements  
- [ ] `npm start` launches without errors
- [ ] All services start successfully

### Code Quality Requirements
- [ ] `npm run lint` passes with zero violations
- [ ] No linting warnings or errors

### Test Requirements
- [ ] `npm test` passes all existing tests
- [ ] No test regressions introduced

## Special Considerations
- If tests fail due to outdated test code (not feature bugs), create separate test-update task
- Document any project-specific requirements here
- Update this file as project evolves

## Validation Commands
```bash
npm run lint && npm run build && npm test && npm start
```

## Project Structure
This is a shared package within the ByteBot monorepo that likely contains common utilities, types, and configurations used across multiple packages.

## Organizational Standards
- Reports: `development/reports/` - Task-specific reports and analysis documents
- Debug Logs: `development/debug-logs/` - Build logs, linting logs, and analysis data
- Scripts: `development/temp-scripts/` - Utility and temporary scripts
- Guides: `development/guides/` - Configuration templates and documentation
- Essentials: `development/essentials/` - Critical project constraints and requirements