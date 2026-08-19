# Human Instructions (Not for AI Agents)

This page is for human developers reading the documentation. AI agents should not rely on content in this file for code generation or modification decisions.

## Repository Notes

### Branch Strategy
- `main` / `master` - Production-ready code
- Feature branches follow naming convention: `feature/{description}`
- Hotfix branches: `hotfix/{description}`

### Environment URLs

| Environment | URL |
|-------------|-----|
| Production | `https://pos.integranet.xyz/produccion/` |
| Test | `https://test.integranet.xyz/produccion/` |

### Server Access
Production server is accessible via SSH alias `pos`:
- Production path: `/var/www/html/integranet.xyz/subdomains/pos/produccion/`
- Test path: `/var/www/html/integranet.xyz/subdomains/test/produccion/`

### Build Pipeline
1. Run `npm run build` or `npm run build_maps`
2. `update_build_info.sh` generates a timestamp in `BuildInfo.ts`
3. Angular build outputs to `dist/posprocesos/browser/`
4. Run `deploy.sh` or `deploy_test.sh` to rsync to server

### Migration History
- See `Migration.md` - Angular version migration history
- See `UpdateToAngular20.md` - Specific Angular 20 update notes

### Offline-First Architecture
The application has been designed with offline-first capabilities. See [Offline Architecture](/docs/offline-architecture.md) for details on how IndexedDB is used to cache data when connectivity is unavailable.

### Known Limitations
- The application is Spanish-only (no i18n support)
- Auth guard currently returns `true` for all routes (authentication is backend-enforced)
- Some routes are commented out (payroll-related)
