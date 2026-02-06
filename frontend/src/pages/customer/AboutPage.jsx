import { Link } from 'react-router-dom'
import CustomerLayout from '../../components/customer/CustomerLayout'

export default function AboutPage() {
    return (
        <CustomerLayout title="About TownBasket" showBack>
            <div className="bg-gray-50 min-h-screen">
                <div className="container-responsive py-4">
                    {/* Logo & Description */}
                    <div className="bg-white rounded-2xl p-6 text-center mb-5 shadow-sm">
                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
                            <span className="text-4xl font-bold text-white">T</span>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 mt-4">TownBasket</h1>
                        <p className="text-emerald-600 font-medium text-sm">Town-first • Trust-first • People-first</p>
                        <p className="text-gray-400 text-xs mt-2">Version 1.0.0</p>
                    </div>

                    {/* Mission */}
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white mb-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative">
                            <h2 className="text-lg font-bold mb-2">Our Mission</h2>
                            <p className="text-emerald-100 text-sm leading-relaxed">
                                To empower local businesses and bring the convenience of online shopping to every town in India.
                                We believe in supporting local shops, creating jobs, and building stronger communities.
                            </p>
                        </div>
                    </div>

                    {/* What We Do */}
                    <div className="bg-white rounded-2xl p-4 mb-5 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">What We Do</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <span>🏪</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">Support Local Shops</p>
                                    <p className="text-xs text-gray-500">We help local businesses go digital and reach more customers.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <span>🛵</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">Fast Delivery</p>
                                    <p className="text-xs text-gray-500">Delivered to your doorstep in 30 minutes or less.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <span>💼</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">Create Jobs</p>
                                    <p className="text-xs text-gray-500">Providing employment opportunities for delivery partners.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <span>💚</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">0% Commission</p>
                                    <p className="text-xs text-gray-500">No commission from shops means better prices for you.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Links */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
                        <Link to="/customer/terms" className="flex items-center gap-4 p-4 hover:bg-gray-50 border-b border-gray-100 transition-colors">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                                <span>📄</span>
                            </div>
                            <span className="font-medium text-gray-900 flex-1">Terms of Service</span>
                            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                        <Link to="/customer/privacy" className="flex items-center gap-4 p-4 hover:bg-gray-50 border-b border-gray-100 transition-colors">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                                <span>🔒</span>
                            </div>
                            <span className="font-medium text-gray-900 flex-1">Privacy Policy</span>
                            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                        <Link to="/customer/contact" className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                                <span>📧</span>
                            </div>
                            <span className="font-medium text-gray-900 flex-1">Contact Us</span>
                            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>

                    {/* Footer */}
                    <div className="text-center pb-6">
                        <p className="text-gray-400 text-xs">Made with ❤️ for small towns of India</p>
                        <p className="text-gray-300 text-[10px] mt-2">© 2026 TownBasket. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </CustomerLayout>
    )
}
