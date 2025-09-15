# Bytebot UI Task Requirements

## Project Overview
This is the **bytebot-ui** package - a Next.js-based web interface for Bytebot, an open-source AI desktop agent. This UI allows users to create tasks, view their desktop agent's work in real-time, and manage AI-driven automation workflows.

## Success Criteria for All Feature Tasks

### Build Requirements
- [ ] `npm run build` completes without errors
- [ ] Next.js build succeeds with zero warnings
- [ ] TypeScript compilation passes without type errors

### Runtime Requirements  
- [ ] `npm run dev` or `npm start` launches without errors
- [ ] Server starts on port 9992 (or configured port)
- [ ] All proxy middleware configurations work correctly
- [ ] Backend service connections are established

### Code Quality Requirements
- [ ] `npm run lint` passes with zero violations
- [ ] ESLint configuration works for TypeScript/React files
- [ ] No React Hook or Next.js linting errors

### Test Requirements
- [ ] `npm test` passes all existing tests
- [ ] No test regressions introduced
- [ ] React Testing Library tests function correctly

## Project-Specific Requirements

### Next.js Architecture
- [ ] App Router structure is maintained (`src/app/`)
- [ ] Server-side rendering functions correctly
- [ ] Client-side routing works properly
- [ ] Static asset serving is functional

### Proxy Configuration
- [ ] Proxy to bytebot-agent (port 9991) works
- [ ] Proxy to bytebot-desktop-vnc (port 9990) works
- [ ] CORS settings allow proper origins
- [ ] Security headers are applied correctly

### UI/UX Requirements
- [ ] Tailwind CSS styles compile correctly
- [ ] Radix UI components function properly
- [ ] Responsive design works on mobile/desktop
- [ ] Dark/light theme switching works
- [ ] File upload functionality works

### Integration Requirements
- [ ] API routes to backend services work
- [ ] Task creation and management functions
- [ ] Real-time desktop viewing is available
- [ ] Socket.io connections work properly

## Special Considerations
- If tests fail due to outdated test code (not feature bugs), create separate test-update task
- Maintain compatibility with shared package (`@bytebot/shared`)
- Ensure security configurations remain intact
- Validate that proxy configurations don't break with changes

## Validation Commands
```bash
# Primary validation sequence
npm run lint && npm run build && npm test && npm start

# TypeScript check
npx tsc --noEmit

# Development server check
npm run dev
```

## Current Known Issues
Based on TODO.json analysis:
1. ESLint configuration needs Next.js build file exclusions
2. TypeScript compilation errors in test suite
3. Need optimization of ESLint rules for enterprise-grade standards

## Architecture Notes
- **Framework**: Next.js 15+ with React 19
- **Package Manager**: PNPM workspaces
- **Styling**: Tailwind CSS with Radix UI components
- **Backend Integration**: Express proxy server with HTTP proxy middleware
- **Security**: Helmet, CORS, and standardized security configurations
- **File Handling**: Base64 file upload with validation
- **Real-time**: Socket.io for live desktop streaming