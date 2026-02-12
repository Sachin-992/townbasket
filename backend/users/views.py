"""
User Views - SECURED

All endpoints that modify user data or return sensitive information
require proper authentication via the Supabase JWT token.
"""
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from .models import User
from .serializers import UserSerializer, UserPublicSerializer, RoleUpdateSerializer
from townbasket_backend.middleware import require_auth, require_role
from core.admin_views import log_admin_action


@api_view(['POST'])
@require_auth  # SECURITY: Now requires valid JWT token
def sync_user(request):
    """
    Create or update user in our database after Supabase authentication.
    
    SECURITY: The supabase_uid is now taken from the VERIFIED JWT token,
    not from request.data. This prevents impersonation attacks.
    """
    # Get verified user ID from the JWT token
    supabase_uid = request.supabase_user.get('user_id')
    phone = request.supabase_user.get('phone', '')
    email = request.supabase_user.get('email', '')
    
    if not supabase_uid:
        return Response(
            {'error': 'Invalid token: missing user ID'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Get or create user - SECURITY: Role is ALWAYS 'customer' on creation
    user, created = User.objects.get_or_create(
        supabase_uid=supabase_uid,
        defaults={
            'phone': phone or '',
            'email': email or '',
            'role': 'customer',  # SECURITY: Default role only, cannot be overridden
            'is_verified': True,
        }
    )
    
    # Update phone/email if they changed (from verified token only)
    if not created:
        updated = False
        if phone and user.phone != phone:
            user.phone = phone
            updated = True
        if email and user.email != email:
            user.email = email
            updated = True
        if updated:
            user.save()
    
    return Response({
        'user': UserSerializer(user).data,
        'is_new_user': created,
    }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['GET'])
@require_auth  # SECURITY: Requires authentication
def get_current_user(request):
    """
    Get the current authenticated user's profile.
    
    SECURITY: User ID comes from verified JWT, not query params.
    """
    supabase_uid = request.supabase_user.get('user_id')
    
    try:
        user = User.objects.get(supabase_uid=supabase_uid)
        return Response(UserSerializer(user).data)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found. Please sync first.'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['PATCH'])
@require_auth
def update_role(request):
    """
    Update user role (first-time role selection only).
    
    SECURITY: 
    - User ID from JWT, not request body
    - Cannot set 'admin' role via this endpoint
    - Only allows initial role selection from 'customer'
    """
    supabase_uid = request.supabase_user.get('user_id')
    
    serializer = RoleUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(supabase_uid=supabase_uid)
        
        new_role = serializer.validated_data['role']
        
        # SECURITY: Prevent role escalation to admin
        if new_role == 'admin':
            return Response(
                {'error': 'Cannot self-assign admin role'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # SECURITY: Only allow role change if currently a customer
        if user.role != 'customer':
            return Response(
                {'error': 'Role already set. Contact admin to change.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user.role = new_role
        user.save()
        
        return Response(UserSerializer(user).data)
        
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@require_auth
@require_role('admin')
def list_users_by_role(request):
    """
    List users by role. Admin only.
    """
    role = request.query_params.get('role')
    if role:
        users = User.objects.filter(role=role)
    else:
        users = User.objects.all()
        
    serializer = UserPublicSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
@require_auth
@require_role('admin')
def toggle_user_active(request, user_id):
    """
    Toggle user active/inactive status. Admin only.
    """
    try:
        user = User.objects.get(id=user_id)
        
        # Prevent disabling self
        if user.supabase_uid == request.supabase_user.get('user_id'):
            return Response(
                {'error': 'Cannot disable your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    user.is_active = not user.is_active
    user.save()
    log_admin_action(request, 'user_toggle', 'user', user.id, {'user_name': user.name, 'is_active': user.is_active})
    
    return Response({
        'message': 'User activated' if user.is_active else 'User deactivated',
        'user': UserPublicSerializer(user).data
    })


@api_view(['PATCH'])
@require_auth
def toggle_online_status(request):
    """
    Toggle online/offline status for delivery partners.
    
    SECURITY: Uses authenticated user's ID from JWT.
    """
    supabase_uid = request.supabase_user.get('user_id')
        
    try:
        user = User.objects.get(supabase_uid=supabase_uid)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Only delivery partners can toggle this
    if user.role != 'delivery':
        return Response(
            {'error': 'Only delivery partners can toggle online status'},
            status=status.HTTP_403_FORBIDDEN
        )
        
    user.is_online = not user.is_online
    user.save()
    
    return Response(UserSerializer(user).data)


@api_view(['GET'])
def list_online_partners(request):
    """
    List delivery partners who have completed enrollment.
    Public endpoint for showing available riders.
    """
    users = User.objects.filter(role='delivery', is_enrolled=True, is_online=True)
    
    # Optional: Filter by town
    town = request.query_params.get('town')
    if town:
        users = users.filter(town=town)
        
    # Return only public info
    return Response(UserPublicSerializer(users, many=True).data)


@api_view(['POST'])
@require_auth
def enroll_delivery_partner(request):
    """
    Complete enrollment for a delivery partner.
    
    SECURITY: User ID from JWT, role set to 'delivery' only if currently customer.
    """
    supabase_uid = request.supabase_user.get('user_id')
    rider_data = request.data.get('rider_data')
    name = request.data.get('name')
    
    if not rider_data:
        return Response(
            {'error': 'rider_data is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    try:
        user = User.objects.get(supabase_uid=supabase_uid)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Only customers can enroll as delivery
    if user.role not in ['customer', 'delivery']:
        return Response(
            {'error': 'Cannot enroll with current role'},
            status=status.HTTP_403_FORBIDDEN
        )
        
    if name:
        user.name = name
    user.rider_data = rider_data
    user.is_enrolled = True
    user.role = 'delivery'
    user.save()
    
    return Response(UserSerializer(user).data)


@api_view(['GET'])
@require_auth
def get_addresses(request):
    """
    Get all saved addresses for the authenticated user.
    """
    supabase_uid = request.supabase_user.get('user_id')
        
    try:
        user = User.objects.get(supabase_uid=supabase_uid)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
    addresses = user.saved_addresses or []
    return Response({'addresses': addresses})


@api_view(['POST'])
@require_auth
def add_address(request):
    """
    Add a new address for the authenticated user.
    """
    supabase_uid = request.supabase_user.get('user_id')
    address = request.data.get('address')
    
    if not address:
        return Response(
            {'error': 'address is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    try:
        user = User.objects.get(supabase_uid=supabase_uid)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    addresses = user.saved_addresses or []
    
    # Generate unique ID for the address
    import uuid
    address['id'] = str(uuid.uuid4())[:8]
    
    # If this is the first address or marked as default, set it as default
    if not addresses or address.get('is_default'):
        for addr in addresses:
            addr['is_default'] = False
        address['is_default'] = True
    
    addresses.append(address)
    user.saved_addresses = addresses
    user.save()
    
    return Response(
        {'addresses': addresses, 'new_address': address},
        status=status.HTTP_201_CREATED
    )


@api_view(['PUT'])
@require_auth
def update_address(request):
    """
    Update an existing address for the authenticated user.
    """
    supabase_uid = request.supabase_user.get('user_id')
    address_id = request.data.get('address_id')
    updated_address = request.data.get('address')
    
    if not address_id or not updated_address:
        return Response(
            {'error': 'address_id and address are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    try:
        user = User.objects.get(supabase_uid=supabase_uid)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    addresses = user.saved_addresses or []
    
    for i, addr in enumerate(addresses):
        if addr.get('id') == address_id:
            updated_address['id'] = address_id
            # If setting as default, unset all others
            if updated_address.get('is_default'):
                for other_addr in addresses:
                    other_addr['is_default'] = False
            addresses[i] = updated_address
            break
    else:
        return Response({'error': 'Address not found'}, status=status.HTTP_404_NOT_FOUND)
    
    user.saved_addresses = addresses
    user.save()
    
    return Response({'addresses': addresses})


@api_view(['DELETE'])
@require_auth
def delete_address(request):
    """
    Delete an address for the authenticated user.
    """
    supabase_uid = request.supabase_user.get('user_id')
    address_id = request.query_params.get('address_id')
    
    if not address_id:
        return Response(
            {'error': 'address_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    try:
        user = User.objects.get(supabase_uid=supabase_uid)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    addresses = user.saved_addresses or []
    original_length = len(addresses)
    addresses = [addr for addr in addresses if addr.get('id') != address_id]
    
    if len(addresses) == original_length:
        return Response({'error': 'Address not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # If we deleted the default address, set the first one as default
    if addresses and not any(addr.get('is_default') for addr in addresses):
        addresses[0]['is_default'] = True
    
    user.saved_addresses = addresses
    user.save()
    
    return Response({'addresses': addresses})


@api_view(['POST'])
@require_auth
def set_default_address(request):
    """
    Set an address as the default for the authenticated user.
    """
    supabase_uid = request.supabase_user.get('user_id')
    address_id = request.data.get('address_id')
    
    if not address_id:
        return Response(
            {'error': 'address_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    try:
        user = User.objects.get(supabase_uid=supabase_uid)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    addresses = user.saved_addresses or []
    found = False
    
    for addr in addresses:
        if addr.get('id') == address_id:
            addr['is_default'] = True
            found = True
        else:
            addr['is_default'] = False
    
    if not found:
        return Response({'error': 'Address not found'}, status=status.HTTP_404_NOT_FOUND)
    
    user.saved_addresses = addresses
    user.save()
    
    return Response({'addresses': addresses})


@api_view(['PATCH'])
@require_auth
def update_profile(request):
    """
    Update user profile (name only - phone comes from verified auth).
    """
    supabase_uid = request.supabase_user.get('user_id')
    
    try:
        user = User.objects.get(supabase_uid=supabase_uid)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Only allow name update via this endpoint
    name = request.data.get('name')
    if name is not None:
        user.name = name
        user.save()
    
    return Response(UserSerializer(user).data)


@api_view(['GET'])
@require_auth
def get_profile_stats(request):
    """
    Get profile statistics (order count, rewards, etc).
    """
    from orders.models import Order
    
    supabase_uid = request.supabase_user.get('user_id')
    
    try:
        user = User.objects.get(supabase_uid=supabase_uid)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get order count
    order_count = Order.objects.filter(customer_supabase_uid=supabase_uid).count()
    
    # Get delivered orders count for tier calculation
    delivered_orders = Order.objects.filter(
        customer_supabase_uid=supabase_uid,
        status='delivered'
    ).count()
    
    # Get actual reward points from user
    rewards = user.reward_points
    
    # Calculate tier based on points
    if rewards >= 600:
        tier = 'platinum'
        tier_name = 'Platinum'
        next_tier_points = None
    elif rewards >= 300:
        tier = 'gold'
        tier_name = 'Gold'
        next_tier_points = 600
    elif rewards >= 100:
        tier = 'silver'
        tier_name = 'Silver'
        next_tier_points = 300
    else:
        tier = 'bronze'
        tier_name = 'Bronze'
        next_tier_points = 100
    
    # Free delivery calculations
    total_spent = float(user.total_orders_value)
    free_deliveries_available = user.free_deliveries_available
    free_deliveries_used = user.free_deliveries_used
    
    # Progress to next free delivery (₹500 milestone)
    current_milestone = int(total_spent / 500) * 500
    next_milestone = current_milestone + 500
    progress_to_next = total_spent - current_milestone
    
    return Response({
        'orders': order_count,
        'delivered_orders': delivered_orders,
        'rewards': rewards,
        'tier': tier,
        'tier_name': tier_name,
        'next_tier_points': next_tier_points,
        'total_spent': total_spent,
        'free_deliveries_available': free_deliveries_available,
        'free_deliveries_used': free_deliveries_used,
        'progress_to_next_free_delivery': progress_to_next,
        'next_free_delivery_milestone': next_milestone,
    })
