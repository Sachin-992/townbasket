import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { complaintsApi } from '../../lib/api'
import CustomerLayout from '../../components/customer/CustomerLayout'

export default function ContactUsPage() {
    const { user } = useAuth()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    })
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')
    const [showDropdown, setShowDropdown] = useState(false)

    const subjectOptions = [
        { value: '', label: 'Select a subject' },
        { value: 'delivery', label: 'Delivery Issue' },
        { value: 'food_quality', label: 'Food Quality Problem' },
        { value: 'app_issue', label: 'App Issue' },
        { value: 'other', label: 'Other' },
    ]

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSubmitting(true)

        try {
            // Map subject to issue_type for backend
            const complaintData = {
                issue_type: formData.subject || 'other',
                description: `${formData.name} (${formData.email})\n\n${formData.message}`,
            }

            await complaintsApi.createComplaint(complaintData)
            setSubmitted(true)
        } catch (err) {
            console.error('Complaint submission failed:', err)
            setError('Failed to submit complaint. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleSelectSubject = (value) => {
        setFormData(prev => ({ ...prev, subject: value }))
        setShowDropdown(false)
    }

    const getSelectedLabel = () => {
        const option = subjectOptions.find(o => o.value === formData.subject)
        return option ? option.label : 'Select a subject'
    }

    return (
        <CustomerLayout title="Contact Us" showBack>
            <div className="bg-gray-50 min-h-screen pb-20">
                <div className="container-responsive py-4">
                    {/* Contact Info Card */}
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white mb-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative">
                            <h2 className="text-xl font-bold mb-2">Get in Touch</h2>
                            <p className="text-emerald-100 text-sm">We'd love to hear from you!</p>
                        </div>
                    </div>

                    {/* Contact Methods */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <a
                            href="tel:+919876543210"
                            className="bg-white rounded-xl p-4 text-center hover:shadow-md transition-shadow"
                        >
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <span className="text-2xl">📞</span>
                            </div>
                            <p className="font-semibold text-gray-900 text-sm">Call Us</p>
                            <p className="text-xs text-gray-500">9 AM - 9 PM</p>
                        </a>
                        <a
                            href="mailto:support@townbasket.com"
                            className="bg-white rounded-xl p-4 text-center hover:shadow-md transition-shadow"
                        >
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <span className="text-2xl">✉️</span>
                            </div>
                            <p className="font-semibold text-gray-900 text-sm">Email Us</p>
                            <p className="text-xs text-gray-500">24hr response</p>
                        </a>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
                        <h3 className="font-bold text-gray-900 mb-4">Send us a Message</h3>

                        {submitted ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">✅</span>
                                </div>
                                <h4 className="font-bold text-gray-900 text-lg">Complaint Submitted!</h4>
                                <p className="text-gray-500 text-sm mt-1">We'll get back to you within 24 hours.</p>
                                <p className="text-emerald-600 text-xs mt-2 font-medium">You can track your complaint status in your profile.</p>
                                <button
                                    onClick={() => {
                                        setSubmitted(false)
                                        setFormData({ name: '', email: '', subject: '', message: '' })
                                    }}
                                    className="mt-4 text-emerald-600 font-semibold"
                                >
                                    Send Another Message
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                                        placeholder="Your name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                                        placeholder="your@email.com"
                                    />
                                </div>

                                {/* Custom Dropdown to fix mobile overlap */}
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowDropdown(!showDropdown)}
                                        className={`w-full p-3 border-2 rounded-xl text-left flex items-center justify-between transition-colors ${showDropdown ? 'border-emerald-500' : 'border-gray-200'
                                            }`}
                                    >
                                        <span className={formData.subject ? 'text-gray-900' : 'text-gray-400'}>
                                            {getSelectedLabel()}
                                        </span>
                                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {showDropdown && (
                                        <>
                                            {/* Backdrop to close dropdown */}
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setShowDropdown(false)}
                                            />
                                            {/* Dropdown Options */}
                                            <div className="absolute left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
                                                {subjectOptions.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => handleSelectSubject(option.value)}
                                                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${formData.subject === option.value
                                                            ? 'bg-emerald-50 text-emerald-600 font-medium'
                                                            : 'text-gray-700'
                                                            } ${option.value === '' ? 'text-gray-400' : ''}`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message <span className="text-gray-400 font-normal">(Optional)</span></label>
                                    <textarea
                                        rows={4}
                                        value={formData.message}
                                        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors resize-none"
                                        placeholder="Describe your issue in detail..."
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting || !formData.subject}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit Complaint'
                                    )}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Office Address */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-3">Our Office</h3>
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <span>📍</span>
                            </div>
                            <div>
                                <p className="text-gray-700 text-sm">TownBasket Headquarters</p>
                                <p className="text-gray-500 text-xs mt-1">
                                    123 Local Market Street<br />
                                    Town Center, TN 600001<br />
                                    India
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-gray-400 text-xs mt-6 pb-4">
                        We typically respond within 24 hours
                    </p>
                </div>
            </div>
        </CustomerLayout>
    )
}

