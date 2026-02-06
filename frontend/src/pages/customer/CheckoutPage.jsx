import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import CustomerLayout from '../../components/customer/CustomerLayout'
import { ordersApi } from '../../lib/api'

export default function CheckoutPage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { cartItems, cartShop, cartTotal, clearCart } = useCart()

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        name: user?.user_metadata?.full_name || '',
        phone: '',
        address: '',
        town: '',
        note: '',
        paymentMethod: 'cod',
    })

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!formData.name || !formData.phone || !formData.address || !formData.town) {
            setError('Please fill all required fields')
            return
        }

        setLoading(true)

        try {
            const orderData = {
                customer_supabase_uid: user.id,
                customer_name: formData.name,
                customer_phone: formData.phone,
                delivery_address: formData.address,
                delivery_town: formData.town,
                shop_id: cartShop.id,
                payment_method: formData.paymentMethod,
                customer_note: formData.note,
                items: cartItems.map(item => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                })),
            }

            const result = await ordersApi.createOrder(orderData)

            if (result.id) {
                clearCart()
                navigate('/customer/order-success', { state: { order: result } })
            } else {
                setError(result.error || 'Failed to place order')
            }
        } catch (err) {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (cartItems.length === 0) {
        return (
            <CustomerLayout title="Checkout" showBack>
                <div className="flex flex-col items-center justify-center py-20 px-4">
                    <span className="text-6xl mb-4">🛒</span>
                    <h1 className="text-lg font-bold">Your cart is empty</h1>
                    <Link to="/customer" className="mt-4 text-emerald-600 font-semibold">Browse Shops</Link>
                </div>
            </CustomerLayout>
        )
    }

    return (
        <CustomerLayout title="Checkout" showBack>
            <form onSubmit={handleSubmit} className="container-responsive py-4 space-y-4">
                {/* Delivery Address */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5">
                    <h2 className="font-bold text-gray-900 text-sm sm:text-base mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-xs font-bold text-emerald-600">1</span>
                        Delivery Address
                    </h2>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                className="w-full border border-gray-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm sm:text-base"
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="Enter phone number"
                                className="w-full border border-gray-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm sm:text-base"
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Complete Address *</label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="House no, Street, Landmark"
                                rows={2}
                                className="w-full border border-gray-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none text-sm sm:text-base"
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Town / City *</label>
                            <input
                                type="text"
                                name="town"
                                value={formData.town}
                                onChange={handleChange}
                                placeholder="Enter town or city"
                                className="w-full border border-gray-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm sm:text-base"
                            />
                        </div>
                    </div>
                </div>

                {/* Payment Method */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5">
                    <h2 className="font-bold text-gray-900 text-sm sm:text-base mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-xs font-bold text-emerald-600">2</span>
                        Payment Method
                    </h2>

                    <div className="space-y-2">
                        <label className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-all ${formData.paymentMethod === 'cod' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:border-gray-200'
                            }`}>
                            <input type="radio" name="paymentMethod" value="cod" checked={formData.paymentMethod === 'cod'} onChange={handleChange} className="hidden" />
                            <span className="text-xl sm:text-2xl">💵</span>
                            <div className="flex-1">
                                <p className="font-semibold text-gray-900 text-sm sm:text-base">Cash on Delivery</p>
                                <p className="text-gray-500 text-xs sm:text-sm">Pay when order arrives</p>
                            </div>
                            {formData.paymentMethod === 'cod' && (
                                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            )}
                        </label>

                        <label className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-all ${formData.paymentMethod === 'upi' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:border-gray-200'
                            }`}>
                            <input type="radio" name="paymentMethod" value="upi" checked={formData.paymentMethod === 'upi'} onChange={handleChange} className="hidden" />
                            <span className="text-xl sm:text-2xl">📱</span>
                            <div className="flex-1">
                                <p className="font-semibold text-gray-900 text-sm sm:text-base">UPI Payment</p>
                                <p className="text-gray-500 text-xs sm:text-sm">Pay via any UPI app</p>
                            </div>
                            {formData.paymentMethod === 'upi' && (
                                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            )}
                        </label>
                    </div>
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5">
                    <h2 className="font-bold text-gray-900 text-sm sm:text-base mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-xs font-bold text-emerald-600">3</span>
                        Order Summary
                    </h2>

                    <div className="space-y-2 text-sm">
                        {cartItems.map(item => (
                            <div key={item.product.id} className="flex justify-between">
                                <span className="text-gray-600">{item.quantity}x {item.product.name}</span>
                                <span className="font-medium">₹{(item.product.discount_price || item.product.price) * item.quantity}</span>
                            </div>
                        ))}
                        <div className="flex justify-between pt-2 border-t border-gray-100">
                            <span className="text-gray-600">Delivery Fee</span>
                            <span className="font-medium text-emerald-600">FREE</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-100 text-base">
                            <span className="font-bold text-gray-900">Total</span>
                            <span className="font-bold text-gray-900">₹{cartTotal.toFixed(0)}</span>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 touch-target"
                >
                    {loading ? (
                        <>
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Placing Order...
                        </>
                    ) : (
                        <>Place Order • ₹{cartTotal.toFixed(0)}</>
                    )}
                </button>
            </form>
        </CustomerLayout>
    )
}
