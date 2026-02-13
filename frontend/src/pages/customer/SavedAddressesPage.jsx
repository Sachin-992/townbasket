import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { usersApi } from '../../lib/api'
import CustomerLayout from '../../components/customer/CustomerLayout'

export default function SavedAddressesPage() {
    const { user } = useAuth()
    const [addresses, setAddresses] = useState([])
    const [loading, setLoading] = useState(true)
    const toast = useToast()
    const confirm = useConfirm()
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingAddress, setEditingAddress] = useState(null)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        type: 'home',
        label: 'Home',
        address_line: '',
        landmark: '',
        pincode: '',
        is_default: false
    })

    const loadAddresses = useCallback(async () => {
        if (!user?.id) return
        try {
            setLoading(true)
            const data = await usersApi.getAddresses(user.id)
            setAddresses(data.addresses || [])
        } catch (err) {
            console.error('Failed to load addresses:', err)
        } finally {
            setLoading(false)
        }
    }, [user?.id])

    useEffect(() => {
        loadAddresses()
    }, [loadAddresses])

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        // Auto-update label based on type
        if (field === 'type') {
            const labels = { home: 'Home', work: 'Work', other: 'Other' }
            setFormData(prev => ({ ...prev, label: labels[value] || value }))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!user?.id) return

        setSaving(true)
        try {
            if (editingAddress) {
                await usersApi.updateAddress(user.id, editingAddress.id, formData)
            } else {
                await usersApi.addAddress(user.id, formData)
            }
            await loadAddresses()
            closeModal()
        } catch (err) {
            console.error('Failed to save address:', err)
            toast.error('Failed to save address. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (addressId) => {
        if (!user?.id) return
        if (!await confirm('Delete Address', 'Are you sure you want to delete this address?')) return

        try {
            await usersApi.deleteAddress(user.id, addressId)
            await loadAddresses()
        } catch (err) {
            console.error('Failed to delete address:', err)
            toast.error('Failed to delete address. Please try again.')
        }
    }

    const handleSetDefault = async (addressId) => {
        if (!user?.id) return

        try {
            await usersApi.setDefaultAddress(user.id, addressId)
            await loadAddresses()
        } catch (err) {
            console.error('Failed to set default address:', err)
        }
    }

    const openAddModal = () => {
        setEditingAddress(null)
        setFormData({
            type: 'home',
            label: 'Home',
            address_line: '',
            landmark: '',
            pincode: '',
            is_default: addresses.length === 0
        })
        setShowAddModal(true)
    }

    const openEditModal = (address) => {
        setEditingAddress(address)
        setFormData({
            type: address.type || 'home',
            label: address.label || 'Home',
            address_line: address.address_line || '',
            landmark: address.landmark || '',
            pincode: address.pincode || '',
            is_default: address.is_default || false
        })
        setShowAddModal(true)
    }

    const closeModal = () => {
        setShowAddModal(false)
        setEditingAddress(null)
        setFormData({
            type: 'home',
            label: 'Home',
            address_line: '',
            landmark: '',
            pincode: '',
            is_default: false
        })
    }

    const getTypeIcon = (type) => {
        switch (type) {
            case 'home': return '🏠'
            case 'work': return '🏢'
            default: return '📍'
        }
    }

    return (
        <CustomerLayout title="Saved Addresses" showBack>
            <div className="bg-gray-50 min-h-screen">
                <div className="container-responsive py-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-gray-900">My Addresses</h1>
                        <button
                            onClick={openAddModal}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 active:scale-95 transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add New
                        </button>
                    </div>

                    {/* Addresses List */}
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-1/3" />
                                            <div className="h-3 bg-gray-200 rounded w-2/3" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : addresses.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center">
                            <span className="text-5xl">📍</span>
                            <h3 className="text-lg font-bold text-gray-900 mt-4">No addresses saved</h3>
                            <p className="text-gray-500 text-sm mt-1">Add your first delivery address to get started</p>
                            <button
                                onClick={openAddModal}
                                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold active:scale-95 transition-all"
                            >
                                Add Address
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {addresses.map((address) => (
                                <div
                                    key={address.id}
                                    className={`bg-white rounded-2xl p-4 border-2 transition-all ${address.is_default ? 'border-emerald-500' : 'border-transparent'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${address.is_default ? 'bg-emerald-100' : 'bg-gray-100'
                                            }`}>
                                            {getTypeIcon(address.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-gray-900">{address.label}</h3>
                                                {address.is_default && (
                                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-600 text-sm line-clamp-2">{address.address_line}</p>
                                            {address.landmark && (
                                                <p className="text-gray-400 text-xs mt-1">Near: {address.landmark}</p>
                                            )}
                                            {address.pincode && (
                                                <p className="text-gray-400 text-xs">PIN: {address.pincode}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                        {!address.is_default && (
                                            <button
                                                onClick={() => handleSetDefault(address.id)}
                                                className="flex-1 py-2 text-emerald-600 font-semibold text-sm hover:bg-emerald-50 rounded-lg transition-colors"
                                            >
                                                Set as Default
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openEditModal(address)}
                                            className="flex-1 py-2 text-gray-600 font-semibold text-sm hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(address.id)}
                                            className="py-2 px-4 text-red-600 font-semibold text-sm hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={closeModal}
                    />
                    <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-24 animate-slide-up max-h-[90vh] overflow-y-auto">
                        {/* Handle */}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 rounded-full sm:hidden" />

                        {/* Header */}
                        <div className="flex items-center justify-between mb-6 pt-4 sm:pt-0">
                            <h2 className="text-xl font-black text-gray-900">
                                {editingAddress ? 'Edit Address' : 'Add New Address'}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Address Type */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Address Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['home', 'work', 'other'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => handleInputChange('type', type)}
                                            className={`p-3 rounded-xl border-2 text-center transition-all ${formData.type === type
                                                ? 'border-emerald-500 bg-emerald-50'
                                                : 'border-gray-200 hover:border-emerald-200'
                                                }`}
                                        >
                                            <span className="text-xl block mb-1">{getTypeIcon(type)}</span>
                                            <span className="text-sm font-medium capitalize">{type}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Label for 'other' type */}
                            {formData.type === 'other' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Label</label>
                                    <input
                                        type="text"
                                        value={formData.label}
                                        onChange={(e) => handleInputChange('label', e.target.value)}
                                        placeholder="e.g., Mom's House, Gym"
                                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                                    />
                                </div>
                            )}

                            {/* Full Address */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Address *</label>
                                <textarea
                                    value={formData.address_line}
                                    onChange={(e) => handleInputChange('address_line', e.target.value)}
                                    placeholder="Enter your complete address with house/flat number, street, area"
                                    rows={3}
                                    required
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors resize-none"
                                />
                            </div>

                            {/* Landmark & Pincode */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Landmark</label>
                                    <input
                                        type="text"
                                        value={formData.landmark}
                                        onChange={(e) => handleInputChange('landmark', e.target.value)}
                                        placeholder="Near..."
                                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Pincode</label>
                                    <input
                                        type="text"
                                        value={formData.pincode}
                                        onChange={(e) => handleInputChange('pincode', e.target.value)}
                                        placeholder="6 digits"
                                        maxLength={6}
                                        pattern="[0-9]*"
                                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Set as Default */}
                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_default}
                                    onChange={(e) => handleInputChange('is_default', e.target.checked)}
                                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                                />
                                <span className="font-medium text-gray-700">Set as default address</span>
                            </label>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={saving || !formData.address_line}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white py-4 rounded-xl font-bold text-lg active:scale-[0.98] transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    editingAddress ? 'Update Address' : 'Save Address'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </CustomerLayout>
    )
}
