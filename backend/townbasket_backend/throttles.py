"""
Custom throttle classes for TownBasket API.
"""
from rest_framework.throttling import UserRateThrottle


class OrderCreateThrottle(UserRateThrottle):
    """Limit order creation to prevent abuse."""
    scope = 'orders'
    rate = '30/hour'


class AuthThrottle(UserRateThrottle):
    """Limit auth-related actions."""
    scope = 'auth'
    rate = '20/hour'


class SensitiveActionThrottle(UserRateThrottle):
    """Limit sensitive admin actions."""
    scope = 'user'
    rate = '100/hour'
