---
description: Run a security audit on admin endpoints checking auth, roles, rate limits, CSP, data leakage
---

# Security Audit Workflow

## Phase 1: Audit
// turbo-all
1. Grep all admin view files for `@require_auth`, `@require_role`, `@rate_limit` decorator coverage
2. Check `settings.py` MIDDLEWARE list for `SecurityHeadersMiddleware` and `AdminCSPMiddleware`
3. Check DRF throttle settings in `REST_FRAMEWORK` config
4. Verify SSE endpoint has manual auth checks
5. Check `export_audit_csv` for sensitive field leakage (`session_id`, `ip_address`, `user_agent`)
6. Check `issue_admin_verify_token` has proper auth decorators
7. Check bulk action endpoints for `@require_admin_verify`

## Phase 2: Fix
8. Add missing `@require_auth` / `@require_role('admin')` decorators
9. Add missing `@rate_limit` decorators
10. Register any unregistered middleware
11. Strip sensitive fields from export endpoints
12. Add `@require_admin_verify` to destructive bulk actions

## Phase 3: Test
// turbo
13. Run `python manage.py test core.tests.test_security`
// turbo
14. Run `npx vite build` to verify frontend still builds clean

## Phase 4: Report
15. Write walkthrough with findings table + endpoint coverage matrix
