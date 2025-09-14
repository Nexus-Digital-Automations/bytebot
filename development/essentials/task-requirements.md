# Project Task Requirements

## Success Criteria for All Feature Tasks

### Build Requirements
- [ ] `npm run build` completes without errors in workspace root
- [ ] All individual package builds succeed (`pnpm run build:shared`, `pnpm run build:agent`, `pnpm run build:ui`, `pnpm run build:bytebotd`)
- [ ] No build warnings or failures

### Runtime Requirements  
- [ ] `npm start` launches without errors in workspace root
- [ ] All services start successfully via workspace commands
- [ ] Individual package start commands work (`pnpm run start:agent`, `pnpm run start:ui`, `pnpm run start:bytebotd`)

### Code Quality Requirements
- [ ] `npm run lint` passes with zero violations in workspace root
- [ ] All individual package linting succeeds (`pnpm run lint:shared`, `pnpm run lint:agent`, `pnpm run lint:ui`, `pnpm run lint:bytebotd`)
- [ ] No linting warnings or errors

### Test Requirements
- [ ] `npm test` passes all existing tests in workspace root
- [ ] All individual package tests pass (`pnpm run test:shared`, `pnpm run test:agent`, `pnpm run test:ui`, `pnpm run test:bytebotd`)
- [ ] No test regressions introduced

## Special Considerations for Bytebot Project
- Workspace uses pnpm with monorepo structure
- Multiple packages must maintain consistency
- Scripts use both `npm` and `npx` prefixes - preserve existing patterns
- Some packages have complex script chains (e.g., Prisma generate → build)
- Quote standardization must not break shell command parsing

## Validation Commands
```bash
# Workspace level validation
pnpm run lint && pnpm run build && pnpm test

# Individual package validation
cd packages/shared && pnpm run lint && pnpm run build && pnpm test
cd packages/bytebot-agent && pnpm run lint && pnpm run build && pnpm test  
cd packages/bytebot-ui && pnpm run lint && pnpm run build && pnpm test
cd packages/bytebotd && pnpm run lint && pnpm run build && pnpm test
cd packages/security-config-analyzer && pnpm run lint && pnpm run build && pnpm test
cd packages/bytebot-agent-cc && pnpm run lint && pnpm run build && pnpm test
```