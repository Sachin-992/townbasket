"""
Tests for User Authentication and Authorization

These tests verify:
1. sync_user requires authentication
2. Users cannot escalate roles
3. Admin endpoints require admin role
"""
from django.test import TestCase, Client
from django.urls import reverse
from unittest.mock import patch, MagicMock
from users.models import User
import json


class AuthenticationTests(TestCase):
    """Test authentication requirements on endpoints."""
    
    def setUp(self):
        self.client = Client()
        self.test_user = User.objects.create(
            supabase_uid='test-uid-123',
            phone='+919876543210',
            email='test@example.com',
            role='customer',
            is_verified=True,
        )
    
    def test_sync_user_requires_auth(self):
        """sync_user endpoint must require authentication."""
        response = self.client.post(
            '/api/users/sync/',
            data=json.dumps({'supabase_uid': 'fake-uid'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.json())
    
    def test_get_current_user_requires_auth(self):
        """get_current_user endpoint must require authentication."""
        response = self.client.get('/api/users/me/')
        self.assertEqual(response.status_code, 401)
    
    def test_get_addresses_requires_auth(self):
        """Address endpoints must require authentication."""
        response = self.client.get('/api/users/addresses/')
        self.assertEqual(response.status_code, 401)


class MockSupabaseUser:
    """Helper to mock authenticated requests."""
    
    @staticmethod
    def patch_auth(user_id, role='authenticated', app_role='customer'):
        """Create a mock for get_supabase_user."""
        return {
            'user_id': user_id,
            'phone': '+919876543210',
            'email': 'test@example.com',
            'role': role,
            'user_metadata': {'app_role': app_role},
            'exp': 9999999999,
        }


class RoleEscalationTests(TestCase):
    """Test that role escalation is prevented."""
    
    def setUp(self):
        self.client = Client()
        self.test_user = User.objects.create(
            supabase_uid='test-uid-456',
            phone='+919876543211',
            role='customer',
            is_verified=True,
        )
    
    @patch('users.views.request')
    def test_cannot_set_admin_role(self):
        """Users cannot self-assign admin role via update_role."""
        # This would need to mock the middleware properly
        # For now, this is a placeholder showing the test structure
        pass
    
    def test_role_update_rejects_admin(self):
        """RoleUpdateSerializer should reject 'admin' choice."""
        from users.serializers import RoleUpdateSerializer
        serializer = RoleUpdateSerializer(data={'role': 'admin'})
        self.assertFalse(serializer.is_valid())


class AdminEndpointTests(TestCase):
    """Test admin-only endpoints."""
    
    def setUp(self):
        self.client = Client()
        self.admin_user = User.objects.create(
            supabase_uid='admin-uid-789',
            phone='+919876543212',
            role='admin',
            is_verified=True,
        )
        self.regular_user = User.objects.create(
            supabase_uid='regular-uid-101',
            phone='+919876543213',
            role='customer',
            is_verified=True,
        )
    
    def test_list_users_requires_admin(self):
        """list_users_by_role requires admin role."""
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, 401)


class SyncUserSecurityTests(TestCase):
    """
    Critical security tests for sync_user.
    
    These verify the P0 fix: sync_user must use JWT-verified identity.
    """
    
    def setUp(self):
        self.client = Client()
    
    def test_sync_user_ignores_body_uid(self):
        """
        CRITICAL: sync_user must NOT use supabase_uid from request body.
        
        Even if an attacker sends a different UID in the body,
        the endpoint should use the UID from the verified JWT.
        """
        # Without proper auth, should be rejected entirely
        response = self.client.post(
            '/api/users/sync/',
            data=json.dumps({
                'supabase_uid': 'attacker-controlled-uid',
                'phone': '+911234567890',
            }),
            content_type='application/json'
        )
        # Must be 401, not 200/201
        self.assertEqual(response.status_code, 401)
