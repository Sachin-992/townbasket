import { supabase } from './supabaseClient'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Get auth headers with Bearer token
const getAuthHeaders = async () => {
    try {
        const { data } = await supabase.auth.getSession()
        const session = data?.session

        console.log('getAuthHeaders - Session:', session ? 'Found' : 'Missing', 'Token:', session?.access_token ? 'Present' : 'None')

        if (!session?.access_token) {
            console.warn('Authentication Warning: No active session found when requesting headers')
        }

        return {
            'Content-Type': 'application/json',
            ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        }
    } catch (e) {
        console.error('getAuthHeaders Error:', e)
        return { 'Content-Type': 'application/json' }
    }
}

// Handle API response
const handleResponse = async (response) => {
    if (response.status === 401) {
        // Token expired or invalid - trigger re-auth
        console.warn('Unauthorized - token may be expired')
        // Could trigger logout here if needed
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(error.error || error.detail || 'Request failed')
    }

    return response.json()
}

// Helper for network retries (Low-Network Stability)
const fetchWithRetry = async (url, options = {}, retries = 2, backoff = 500) => {
    try {
        const response = await fetch(url, options)

        // Retry on 5xx errors too? Maybe unsafe. Let's stick to network errors for now.
        // But fetch only throws on network failure.

        return response
    } catch (error) {
        // Only retry safe methods (GET) or if explicitly allowed
        const isSafeMethod = !options.method || options.method === 'GET'

        if (retries > 0 && isSafeMethod) {
            console.warn(`Retrying request to ${url}... (${retries} attempts left)`)
            await new Promise(r => setTimeout(r, backoff))
            return fetchWithRetry(url, options, retries - 1, backoff * 1.5)
        }
        throw error
    }
}

// Shops API
export const shopsApi = {
    getCategories: async () => {
        const response = await fetchWithRetry(`${API_BASE_URL}/shops/categories/`)
        return handleResponse(response)
    },

    getShops: async (category = null) => {
        let url = `${API_BASE_URL}/shops/`
        if (category) {
            url += `?category=${category}`
        }
        const response = await fetchWithRetry(url)
        return handleResponse(response)
    },

    getShop: async (shopId) => {
        const response = await fetchWithRetry(`${API_BASE_URL}/shops/${shopId}/`)
        return handleResponse(response)
    },

    getMyShop: async (supabaseUid) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/shops/my-shop/?supabase_uid=${supabaseUid}`, {
            headers
        })
        if (response.status === 404) {
            return { hasShop: false }
        }
        return handleResponse(response).then(data => ({ hasShop: true, shop: data }))
    },

    createShop: async (shopData) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/shops/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(shopData),
        })
        return handleResponse(response)
    },

    updateShop: async (shopId, shopData) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/shops/${shopId}/`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(shopData),
        })
        return handleResponse(response)
    },

    toggleShopOpen: async (shopId) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/shops/${shopId}/toggle-open/`, {
            method: 'PATCH',
            headers,
        })
        return handleResponse(response)
    },

    // Admin APIs
    getPendingShops: async () => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/shops/pending/`, { headers })
        return handleResponse(response)
    },

    getAllShops: async () => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/shops/all/`, { headers })
        return handleResponse(response)
    },

    approveShop: async (shopId) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/shops/${shopId}/approve/`, {
            method: 'PATCH',
            headers,
        })
        return handleResponse(response)
    },

    rejectShop: async (shopId) => {
        const { data, error } = await supabase.auth.getSession()
        if (error || !data.session) throw new Error('Not authenticated')

        const response = await fetch(`${API_URL}/api/shops/${shopId}/reject/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${data.session.access_token}`,
                'Content-Type': 'application/json',
            },
        })
        return response.json()
    },

    toggleShopActive: async (shopId) => {
        const { data, error } = await supabase.auth.getSession()
        if (error || !data.session) throw new Error('Not authenticated')

        const response = await fetch(`${API_BASE_URL}/shops/${shopId}/toggle-active/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${data.session.access_token}`,
                'Content-Type': 'application/json',
            },
        })
        return response.json()
    },

    // Admin Stats
    getAdminStats: async () => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/shops/admin/stats/`, { headers })
        return handleResponse(response)
    },
}

// Products API
export const productsApi = {
    getProducts: async (shopId) => {
        const response = await fetchWithRetry(`${API_BASE_URL}/products/?shop_id=${shopId}`)
        return handleResponse(response)
    },

    createProduct: async (productData) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/products/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(productData),
        })
        return handleResponse(response)
    },

    updateProduct: async (productId, productData) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/products/${productId}/`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(productData),
        })
        return handleResponse(response)
    },

    deleteProduct: async (productId) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/products/${productId}/`, {
            method: 'DELETE',
            headers,
        })
        if (response.status === 204) {
            return { success: true }
        }
        return handleResponse(response)
    },

    toggleStock: async (productId) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/products/${productId}/toggle-stock/`, {
            method: 'PATCH',
            headers,
        })
        return handleResponse(response)
    },
}

// Orders API
export const ordersApi = {
    getSellerOrders: async (supabaseUid, status = null) => {
        const headers = await getAuthHeaders()
        let url = `${API_BASE_URL}/orders/seller/?supabase_uid=${supabaseUid}`
        if (status) {
            url += `&status=${status}`
        }
        const response = await fetchWithRetry(url, { headers })
        return handleResponse(response)
    },

    getCustomerOrders: async (supabaseUid) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/orders/customer/?supabase_uid=${supabaseUid}`, {
            headers
        })
        return handleResponse(response)
    },

    createOrder: async (orderData) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/orders/create/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(orderData),
        })
        return handleResponse(response)
    },

    updateOrderStatus: async (orderId, status, sellerNote = '') => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/orders/${orderId}/status/`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status, seller_note: sellerNote }),
        })
        return handleResponse(response)
    },

    // Delivery APIs
    getDeliveryOrders: async (filter = 'available') => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/orders/delivery/?status=${filter}`, {
            headers
        })
        return handleResponse(response)
    },

    acceptDelivery: async (orderId, deliveryUid) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/orders/${orderId}/accept-delivery/`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ delivery_uid: deliveryUid }),
        })
        return handleResponse(response)
    },

    getDeliveryStats: async () => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/orders/delivery/stats/`, { headers })
        return handleResponse(response)
    },

    // Admin APIs
    getAllOrders: async () => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/orders/all/`, { headers })
        return handleResponse(response)
    },
}

// Storage API (Supabase Storage)
export const storageApi = {
    uploadImage: async (file, bucket = 'products', folder = '') => {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            throw new Error('Must be logged in to upload images')
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = folder ? `${folder}/${fileName}` : fileName

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            })

        if (error) {
            throw error
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath)

        return { path: filePath, url: publicUrl }
    },

    deleteImage: async (path, bucket = 'products') => {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([path])

        if (error) {
            throw error
        }

        return { success: true }
    },

    getPublicUrl: (path, bucket = 'products') => {
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(path)
        return publicUrl
    }
}

// Users API (Admin)
export const usersApi = {
    getUsersByRole: async (role) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/users/list/?role=${role}`, { headers })
        return handleResponse(response)
    },

    getCurrentUser: async (supabaseUid) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/users/me/?supabase_uid=${supabaseUid}`, { headers })
        return handleResponse(response)
    },

    syncUser: async (userData) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/users/sync/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(userData),
        })
        return handleResponse(response)
    },

    toggleUserActive: async (userId) => {
        const { data, error } = await supabase.auth.getSession()
        if (error || !data.session) throw new Error('Not authenticated')

        const response = await fetch(`${API_BASE_URL}/users/${userId}/toggle-active/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${data.session.access_token}`,
                'Content-Type': 'application/json',
            },
        })
        return response.json()
    },

    toggleOnlineStatus: async (supabaseUid) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/users/toggle-online/`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ supabase_uid: supabaseUid }),
        })
        return handleResponse(response)
    },

    getOnlinePartners: async (town = null) => {
        const headers = await getAuthHeaders()
        let url = `${API_BASE_URL}/users/online-partners/`
        if (town) url += `?town=${town}`
        const response = await fetchWithRetry(url, { headers })
        return handleResponse(response)
    },

    enrollDeliveryPartner: async (enrollData) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/users/enroll/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(enrollData),
        })
        return handleResponse(response)
    },

    // Address Management
    getAddresses: async (supabaseUid) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/users/addresses/?supabase_uid=${supabaseUid}`, { headers })
        return handleResponse(response)
    },

    addAddress: async (supabaseUid, address) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/users/addresses/add/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ supabase_uid: supabaseUid, address }),
        })
        return handleResponse(response)
    },

    updateAddress: async (supabaseUid, addressId, address) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/users/addresses/update/`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ supabase_uid: supabaseUid, address_id: addressId, address }),
        })
        return handleResponse(response)
    },

    deleteAddress: async (supabaseUid, addressId) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/users/addresses/delete/?supabase_uid=${supabaseUid}&address_id=${addressId}`, {
            method: 'DELETE',
            headers,
        })
        return handleResponse(response)
    },

    setDefaultAddress: async (supabaseUid, addressId) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/users/addresses/set-default/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ supabase_uid: supabaseUid, address_id: addressId }),
        })
        return handleResponse(response)
    },

    // Profile Management
    updateProfile: async (supabaseUid, profileData) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/users/profile/update/`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ supabase_uid: supabaseUid, ...profileData }),
        })
        return handleResponse(response)
    },

    getProfileStats: async (supabaseUid) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/users/profile/stats/?supabase_uid=${supabaseUid}`, { headers })
        return handleResponse(response)
    },
}

// Complaints API
export const complaintsApi = {
    createComplaint: async (complaintData) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/complaints/create/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(complaintData),
        })
        return handleResponse(response)
    },

    getAllComplaints: async (status = null) => {
        const headers = await getAuthHeaders()
        let url = `${API_BASE_URL}/complaints/list/`
        if (status) {
            url += `?status=${status}`
        }
        const response = await fetchWithRetry(url, { headers })
        return handleResponse(response)
    },

    resolveComplaint: async (complaintId, resolutionData) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/complaints/${complaintId}/resolve/`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(resolutionData)
        })
        return handleResponse(response)
    }
}

// Global Settings API
export const settingsApi = {
    getSettings: async () => {
        const response = await fetchWithRetry(`${API_BASE_URL}/core/settings/`)
        return handleResponse(response)
    },

    updateSettings: async (settingsData) => {
        const headers = await getAuthHeaders()
        const response = await fetchWithRetry(`${API_BASE_URL}/core/settings/`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(settingsData)
        })
        return handleResponse(response)
    }
}
