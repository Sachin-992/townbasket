import CustomerLayout from '../../components/customer/CustomerLayout'

export default function PrivacyPolicyPage() {
    return (
        <CustomerLayout title="Privacy Policy" showBack>
            <div className="bg-gray-50 min-h-screen">
                <div className="container-responsive py-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                        <h1 className="text-xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
                        <p className="text-gray-500 text-xs mb-4">Last updated: January 2026</p>

                        <div className="space-y-6 text-sm text-gray-700">
                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">1. Information We Collect</h2>
                                <p className="mb-2">We collect the following types of information:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Account Information:</strong> Name, email, phone number</li>
                                    <li><strong>Delivery Information:</strong> Addresses, landmarks, pin codes</li>
                                    <li><strong>Order History:</strong> Items ordered, shops visited, preferences</li>
                                    <li><strong>Device Information:</strong> Device type, operating system, app version</li>
                                    <li><strong>Location Data:</strong> When you permit, for delivery purposes</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">2. How We Use Your Information</h2>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>To process and deliver your orders</li>
                                    <li>To communicate order updates and notifications</li>
                                    <li>To improve our services and user experience</li>
                                    <li>To provide customer support</li>
                                    <li>To send promotional offers (with your consent)</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">3. Information Sharing</h2>
                                <p className="mb-2">We share your information with:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Shops:</strong> To fulfill your orders</li>
                                    <li><strong>Delivery Partners:</strong> Name, address, and phone for delivery</li>
                                    <li><strong>Payment Processors:</strong> To process payments securely</li>
                                </ul>
                                <p className="mt-2">We never sell your personal information to third parties.</p>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">4. Data Security</h2>
                                <p>We implement industry-standard security measures to protect your data including encryption, secure servers, and regular security audits.</p>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">5. Data Retention</h2>
                                <p>We retain your data for as long as your account is active or as needed to provide services. You can request deletion of your data at any time.</p>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">6. Your Rights</h2>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Access your personal data</li>
                                    <li>Correct inaccurate data</li>
                                    <li>Request deletion of your data</li>
                                    <li>Opt-out of marketing communications</li>
                                    <li>Export your data in a portable format</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">7. Cookies</h2>
                                <p>We use cookies and similar technologies to improve your experience, remember preferences, and analyze usage patterns.</p>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">8. Children's Privacy</h2>
                                <p>Our services are not intended for users under 18 years of age. We do not knowingly collect information from children.</p>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">9. Changes to This Policy</h2>
                                <p>We may update this policy periodically. We will notify you of significant changes via email or in-app notification.</p>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">10. Contact Us</h2>
                                <p>For privacy-related questions, contact our Data Protection Officer at privacy@townbasket.com</p>
                            </section>
                        </div>
                    </div>

                    <p className="text-center text-gray-400 text-xs mt-6 pb-4">
                        © 2026 TownBasket. All rights reserved.
                    </p>
                </div>
            </div>
        </CustomerLayout>
    )
}
