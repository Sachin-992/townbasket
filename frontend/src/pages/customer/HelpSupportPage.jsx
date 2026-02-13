import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import CustomerLayout from '../../components/customer/CustomerLayout'

export default function HelpSupportPage() {
    const [expandedFaq, setExpandedFaq] = useState(null)
    const toast = useToast()

    const faqs = [
        {
            id: 1,
            question: 'How do I place an order?',
            answer: 'Browse shops on the home page, select items to add to cart, then proceed to checkout. Choose your delivery address and confirm your order.'
        },
        {
            id: 2,
            question: 'How can I track my order?',
            answer: 'Go to "My Orders" in your profile to see real-time status of all your orders. You will also receive notifications as your order status updates.'
        },
        {
            id: 3,
            question: 'What payment methods are supported?',
            answer: 'Currently we support Cash on Delivery (COD). UPI and card payments are coming soon!'
        },
        {
            id: 4,
            question: 'How do I cancel an order?',
            answer: 'You can cancel an order if it has not been accepted by the seller yet. Go to "My Orders" and click on the order you want to cancel.'
        },
        {
            id: 5,
            question: 'What is the delivery time?',
            answer: 'Delivery time varies by shop, but most orders are delivered within 30-60 minutes. You can see estimated delivery time on each shop page.'
        },
        {
            id: 6,
            question: 'How do I report an issue with my order?',
            answer: 'You can file a complaint through the "File a Complaint" option below. Our support team will get back to you within 24 hours.'
        }
    ]

    const toggleFaq = (id) => {
        setExpandedFaq(expandedFaq === id ? null : id)
    }

    return (
        <CustomerLayout title="Help & Support" showBack>
            <div className="bg-gray-50 min-h-screen">
                <div className="container-responsive py-4">
                    {/* Contact Card */}
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white mb-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative">
                            <h2 className="text-xl font-bold mb-2">Need Help?</h2>
                            <p className="text-blue-100 text-sm mb-4">We are here to help you 24/7</p>
                            <div className="flex flex-wrap gap-3">
                                <a
                                    href="tel:+919876543210"
                                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                                >
                                    <span>📞</span>
                                    <span className="text-sm font-medium">Call Us</span>
                                </a>
                                <a
                                    href="mailto:support@townbasket.com"
                                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                                >
                                    <span>✉️</span>
                                    <span className="text-sm font-medium">Email</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <Link
                            to="/customer/orders"
                            className="bg-white rounded-xl p-4 text-center hover:shadow-md transition-shadow"
                        >
                            <span className="text-2xl">📋</span>
                            <p className="font-semibold text-gray-900 mt-2 text-sm">Track Order</p>
                        </Link>
                        <Link
                            to="/customer/addresses"
                            className="bg-white rounded-xl p-4 text-center hover:shadow-md transition-shadow"
                        >
                            <span className="text-2xl">📍</span>
                            <p className="font-semibold text-gray-900 mt-2 text-sm">Manage Address</p>
                        </Link>
                    </div>

                    {/* FAQs */}
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Frequently Asked Questions</h3>
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
                        {faqs.map((faq) => (
                            <div key={faq.id} className="border-b border-gray-100 last:border-0">
                                <button
                                    onClick={() => toggleFaq(faq.id)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                                >
                                    <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                                    <svg
                                        className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${expandedFaq === faq.id ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {expandedFaq === faq.id && (
                                    <div className="px-4 pb-4">
                                        <p className="text-gray-600 text-sm">{faq.answer}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* File Complaint */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-3">Still need help?</h3>
                        <p className="text-gray-500 text-sm mb-4">If you have any issues with your order or service, you can file a complaint and our team will assist you.</p>
                        <button
                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl font-semibold transition-colors"
                            onClick={() => toast.info('Complaint feature coming soon!')}
                        >
                            File a Complaint
                        </button>
                    </div>

                    {/* Contact Info */}
                    <div className="mt-6 text-center text-gray-400 text-sm pb-4">
                        <p>Support Hours: 9 AM - 9 PM (Mon-Sat)</p>
                        <p className="mt-1">Email: support@townbasket.com</p>
                    </div>
                </div>
            </div>
        </CustomerLayout>
    )
}
