"""
Security Simulation Tests — Admin Endpoint Hardening
────────────────────────────────────────────────────
Simulates:
  1. Unauthenticated access to admin endpoints
  2. Non-admin role escalation attempts
  3. Token tampering / invalid JWT
  4. Rate limit abuse
  5. Bulk action without 2FA verify token
  6. Malicious admin — rapid fire actions
  7. Audit export data leakage check
  8. SSE connection without auth

Run:  python manage.py test core.tests.test_security -v2
"""
from django.test import TestCase, RequestFactory
from django.http import JsonResponse
from unittest.mock import patch, MagicMock
import json
import time

from core.admin_views import admin_overview, audit_admin_list, export_audit_csv
from core.fraud_views import fraud_alerts, dismiss_alert
from core.bulk import bulk_shops, bulk_users
from core.admin_security import issue_admin_verify_token
from core.admin_sse import admin_sse
from core.views import town_settings_update


def _make_admin_user(uid='admin-uid-1'):
    """Return a user dict that passes require_auth + require_role('admin')."""
    return {
        'user_id': uid,
        'sub': uid,
        'role': 'admin',
        'user_metadata': {'app_role': 'admin'},
    }


def _make_customer_user(uid='cust-uid-1', app_role='customer'):
    """Return a user dict for non-admin roles."""
    return {
        'user_id': uid,
        'sub': uid,
        'role': 'authenticated',
        'user_metadata': {'app_role': app_role},
    }


class SecurityTestMixin:
    """Shared helpers for security tests."""

    def setUp(self):
        self.factory = RequestFactory()

    def _get(self, path='/api/admin/test/'):
        return self.factory.get(path, content_type='application/json')

    def _post(self, path='/api/admin/test/', data=None):
        return self.factory.post(
            path,
            data=json.dumps(data or {}),
            content_type='application/json',
        )


# ─────────────────────────────────────────────
# Test 1: Unauthenticated access
# ─────────────────────────────────────────────
class TestUnauthenticatedAccess(SecurityTestMixin, TestCase):
    """All admin endpoints reject requests with no token."""

    @patch('townbasket_backend.middleware.get_supabase_user', return_value=None)
    def test_overview_requires_auth(self, _mock):
        request = self._get()
        response = admin_overview(request)
        self.assertEqual(response.status_code, 401)

    @patch('townbasket_backend.middleware.get_supabase_user', return_value=None)
    def test_fraud_alerts_requires_auth(self, _mock):
        request = self._get()
        response = fraud_alerts(request)
        self.assertEqual(response.status_code, 401)

    @patch('townbasket_backend.middleware.get_supabase_user', return_value=None)
    def test_verify_token_requires_auth(self, _mock):
        request = self._post()
        response = issue_admin_verify_token(request)
        self.assertEqual(response.status_code, 401)


# ─────────────────────────────────────────────
# Test 2: Non-admin role escalation
# ─────────────────────────────────────────────
class TestRoleEscalation(SecurityTestMixin, TestCase):
    """Customer/seller/delivery roles are blocked from admin endpoints."""

    @patch('townbasket_backend.middleware.get_supabase_user')
    def test_customer_blocked_from_overview(self, mock_auth):
        mock_auth.return_value = _make_customer_user()
        request = self._get()
        response = admin_overview(request)
        self.assertEqual(response.status_code, 403)

    @patch('townbasket_backend.middleware.get_supabase_user')
    def test_seller_blocked_from_fraud(self, mock_auth):
        mock_auth.return_value = _make_customer_user(app_role='seller')
        request = self._get()
        response = fraud_alerts(request)
        self.assertEqual(response.status_code, 403)

    @patch('townbasket_backend.middleware.get_supabase_user')
    def test_delivery_blocked_from_bulk(self, mock_auth):
        mock_auth.return_value = _make_customer_user(app_role='delivery')
        request = self._post(data={'action': 'approve', 'ids': [1]})
        response = bulk_shops(request)
        self.assertEqual(response.status_code, 403)


# ─────────────────────────────────────────────
# Test 3: Token tampering / invalid JWT
# ─────────────────────────────────────────────
class TestTokenTampering(SecurityTestMixin, TestCase):
    """Expired / invalid tokens are rejected."""

    @patch('townbasket_backend.middleware.get_supabase_user')
    def test_expired_token_rejected(self, mock_auth):
        mock_auth.return_value = {'error': 'Token expired'}
        request = self._get()
        response = admin_overview(request)
        self.assertEqual(response.status_code, 401)

    @patch('townbasket_backend.middleware.get_supabase_user')
    def test_invalid_signature_rejected(self, mock_auth):
        mock_auth.return_value = {'error': 'Invalid token signature'}
        request = self._get()
        response = admin_overview(request)
        self.assertEqual(response.status_code, 401)


# ─────────────────────────────────────────────
# Test 4: Rate limit abuse
# ─────────────────────────────────────────────
class TestRateLimitAbuse(SecurityTestMixin, TestCase):
    """Rate limits return 429 when exceeded."""

    @patch('core.rate_limit.cache')
    @patch('townbasket_backend.middleware.get_supabase_user')
    def test_rate_limit_blocks_excess(self, mock_auth, mock_cache):
        mock_auth.return_value = _make_admin_user()
        # Simulate already at limit: count > max_requests
        mock_cache.get.return_value = {'count': 999, 'window_start': time.time()}
        request = self._get()
        response = admin_overview(request)
        self.assertEqual(response.status_code, 429)


# ─────────────────────────────────────────────
# Test 5: Bulk actions without 2FA verify token
# ─────────────────────────────────────────────
class TestBulkWithout2FA(SecurityTestMixin, TestCase):
    """Bulk actions without X-Admin-Verify-Token are blocked."""

    @patch('townbasket_backend.middleware.get_supabase_user')
    def test_bulk_shops_requires_verify_token(self, mock_auth):
        mock_auth.return_value = _make_admin_user()
        request = self._post(data={'action': 'approve', 'ids': [1, 2, 3]})
        # No X-Admin-Verify-Token header set
        response = bulk_shops(request)
        self.assertEqual(response.status_code, 403)

    @patch('townbasket_backend.middleware.get_supabase_user')
    def test_bulk_users_requires_verify_token(self, mock_auth):
        mock_auth.return_value = _make_admin_user()
        request = self._post(data={'action': 'deactivate', 'ids': [1]})
        response = bulk_users(request)
        self.assertEqual(response.status_code, 403)


# ─────────────────────────────────────────────
# Test 6: Malicious admin — rapid fire
# ─────────────────────────────────────────────
class TestMaliciousAdmin(SecurityTestMixin, TestCase):
    """Suspicious admin activity triggers rate limits."""

    @patch('core.rate_limit.cache')
    @patch('townbasket_backend.middleware.get_supabase_user')
    def test_rapid_fire_triggers_429(self, mock_auth, mock_cache):
        mock_auth.return_value = _make_admin_user()
        mock_cache.get.return_value = {'count': 200, 'window_start': time.time()}
        request = self._get()
        response = audit_admin_list(request)
        self.assertEqual(response.status_code, 429)


# ─────────────────────────────────────────────
# Test 7: Audit CSV data leakage
# ─────────────────────────────────────────────
class TestAuditDataLeakage(SecurityTestMixin, TestCase):
    """Audit CSV export must not contain session_id or ip_address."""

    @patch('core.admin_views.AuditLog')
    @patch('townbasket_backend.middleware.get_supabase_user')
    def test_csv_excludes_sensitive_fields(self, mock_auth, MockLog):
        import csv, io

        mock_auth.return_value = _make_admin_user()

        # Build a mock queryset that supports slicing and iteration
        mock_qs = MagicMock()
        mock_qs.filter.return_value = mock_qs
        mock_qs.__getitem__ = MagicMock(return_value=[])  # [:5000]
        mock_qs.count.return_value = 0
        MockLog.objects.all.return_value = mock_qs

        request = self._get('/api/admin/audit/export/')
        response = export_audit_csv(request)

        if response.status_code == 200:
            content = response.content.decode('utf-8') if hasattr(response, 'content') else ''
            if content:
                reader = csv.reader(io.StringIO(content))
                headers = next(reader, [])
                self.assertNotIn('Session ID', headers,
                                 'CSV leaks session_id — sensitive data exposure')
                self.assertNotIn('IP Address', headers,
                                 'CSV leaks ip_address — sensitive data exposure')


# ─────────────────────────────────────────────
# Test 8: SSE without auth
# ─────────────────────────────────────────────
class TestSSEWithoutAuth(SecurityTestMixin, TestCase):
    """SSE endpoint rejects unauthenticated connections."""

    @patch('core.admin_sse.get_supabase_user', return_value=None)
    def test_sse_rejects_no_token(self, _mock):
        request = self._get('/api/admin/sse/')
        response = admin_sse(request)
        self.assertEqual(response.status_code, 401)

    @patch('core.admin_sse.get_supabase_user')
    def test_sse_rejects_invalid_token(self, mock_auth):
        mock_auth.return_value = {'error': 'Invalid token'}
        request = self._get('/api/admin/sse/')
        response = admin_sse(request)
        self.assertEqual(response.status_code, 401)
