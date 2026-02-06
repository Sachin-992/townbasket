import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [resetEmail, setResetEmail] = useState('')
    const [showResetModal, setShowResetModal] = useState(false)
    const [resetLoading, setResetLoading] = useState(false)
    const [resetMessage, setResetMessage] = useState({ type: '', text: '' })

    const { signIn, resetPassword } = useAuth()
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')

        if (!email || !password) {
            setError('Please fill in all fields')
            return
        }

        setLoading(true)
        const { error: signInError } = await signIn(email, password)
        setLoading(false)

        if (signInError) {
            setError(signInError.message || 'Invalid email or password')
        } else {
            navigate('/select-role')
        }
    }

    const handleForgotPassword = async (e) => {
        e.preventDefault()
        if (!resetEmail) {
            setResetMessage({ type: 'error', text: 'Please enter your email address' })
            return
        }

        setResetLoading(true)
        setResetMessage({ type: '', text: '' })

        const { error: resetError } = await resetPassword(resetEmail)
        setResetLoading(false)

        if (resetError) {
            setResetMessage({ type: 'error', text: resetError.message || 'Failed to send reset email' })
        } else {
            setResetMessage({ type: 'success', text: 'Password reset link sent! Check your inbox.' })
            setTimeout(() => {
                setShowResetModal(false)
                setResetMessage({ type: '', text: '' })
            }, 5000)
        }
    }

    return (
        <div className="min-h-screen bg-white grid lg:grid-cols-2 selection:bg-emerald-100">
            {/* Left Side: Visual Hero */}
            <div className="hidden lg:flex relative bg-emerald-600 overflow-hidden flex-col p-12 xl:p-16">
                {/* Dynamic Background Elements */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />

                    {/* Floating Icons Pattern */}
                    <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
                        <div className="absolute top-[15%] left-[10%] text-9xl -rotate-12">🏪</div>
                        <div className="absolute top-[40%] right-[15%] text-8xl rotate-12">🛒</div>
                        <div className="absolute bottom-[25%] left-[20%] text-9xl rotate-6">🚚</div>
                    </div>
                </div>

                {/* Logo Section */}
                <div className="relative z-20 flex items-center gap-4 group">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-900/20 group-hover:scale-105 transition-transform duration-300">
                        <span className="text-emerald-600 text-3xl font-black">T</span>
                    </div>
                    <div>
                        <span className="text-3xl font-black tracking-tight text-white block">TownBasket</span>
                        <span className="text-emerald-200 text-sm font-medium tracking-widest uppercase">Community First</span>
                    </div>
                </div>

                {/* Main Hero Content */}
                <div className="flex-1 flex flex-col justify-center relative z-10 text-white mt-8">
                    <h1 className="text-5xl xl:text-6xl font-black mb-6 leading-[1.1] tracking-tight">
                        Your town's<br />
                        <span className="text-emerald-300">finest</span> delivery<br />
                        experience.
                    </h1>

                    <p className="text-emerald-100/90 text-xl max-w-lg font-medium leading-relaxed mb-8">
                        Connecting your favorite local shops with the speed and trust of your community.
                    </p>

                    {/* Feature Pills */}
                    <div className="flex flex-wrap gap-4">
                        {['100+ Local Stores', 'Zero Commission', '30m Delivery'].map((feature) => (
                            <div key={feature} className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-bold shadow-lg">
                                {feature}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Stats Grid */}
                <div className="relative z-10 grid grid-cols-3 gap-12 pt-8 border-t border-emerald-500/50 text-white mt-auto">
                    <div className="space-y-1">
                        <p className="text-4xl font-black font-mono">100+</p>
                        <p className="text-emerald-200/80 text-xs font-bold uppercase tracking-widest">Shops</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-4xl font-black font-mono">30</p>
                        <p className="text-emerald-200/80 text-xs font-bold uppercase tracking-widest">Min Avg</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-4xl font-black font-mono">0%</p>
                        <p className="text-emerald-200/80 text-xs font-bold uppercase tracking-widest">Commission</p>
                    </div>
                </div>
            </div>

            {/* Right Side: Authentication Form */}
            <div className="flex flex-col justify-center items-center p-8 lg:p-12 bg-gray-50/30 overflow-y-auto">
                <div className="w-full max-w-[440px] space-y-6">
                    {/* Header */}
                    <div className="text-center lg:text-left space-y-3">
                        {/* Mobile-only Logo */}
                        <div className="lg:hidden w-16 h-16 bg-emerald-600 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-emerald-200 mb-6">
                            <span className="text-white text-3xl font-black">T</span>
                        </div>
                        <h2 className="text-4xl font-black text-gray-900 tracking-tight">Welcome back</h2>
                        <p className="text-gray-500 text-lg font-medium">Please enter your details to sign in.</p>
                    </div>

                    {/* Auth Card */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden group">
                        {/* Subtle decorative elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full translate-x-16 -translate-y-16 group-hover:bg-emerald-100 transition-colors duration-500" />

                        <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium text-gray-900 shadow-inner"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-sm font-bold text-gray-700">Password</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setResetEmail(email)
                                            setShowResetModal(true)
                                            setResetMessage({ type: '', text: '' })
                                        }}
                                        className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                                    >
                                        Forgot?
                                    </button>
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium text-gray-900 shadow-inner"
                                />
                            </div>

                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-shake">
                                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white h-14 rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Sign In...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In to TownBasket</span>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Footer Links */}
                    <div className="flex flex-col items-center gap-6">
                        <p className="text-gray-500 font-bold">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-emerald-600 hover:text-emerald-700 hover:underline underline-offset-4 decoration-2">
                                Create an Account
                            </Link>
                        </p>

                        <div className="flex items-center gap-3">
                            <span className="w-8 h-px bg-gray-200" />
                            <div className="px-4 py-2 bg-white rounded-full border border-gray-100 shadow-sm flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Official Town Partner</span>
                            </div>
                            <span className="w-8 h-px bg-gray-200" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-[440px] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 sm:p-10">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Reset Password</h3>
                                <button
                                    onClick={() => setShowResetModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <p className="text-gray-500 font-medium mb-8">
                                Enter your email address and we'll send you a link to reset your password.
                            </p>

                            <form onSubmit={handleForgotPassword} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium text-gray-900 shadow-inner"
                                        required
                                    />
                                </div>

                                {resetMessage.text && (
                                    <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${resetMessage.type === 'error' ? 'bg-rose-50 border border-rose-100 text-rose-600' : 'bg-emerald-50 border border-emerald-100 text-emerald-600'
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${resetMessage.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'
                                            }`} />
                                        {resetMessage.text}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={resetLoading}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white h-14 rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                >
                                    {resetLoading ? (
                                        <>
                                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Sending link...</span>
                                        </>
                                    ) : (
                                        <span>Send Reset Link</span>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
