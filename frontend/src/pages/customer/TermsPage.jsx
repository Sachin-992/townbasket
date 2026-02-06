import CustomerLayout from '../../components/customer/CustomerLayout'

export default function TermsPage() {
    return (
        <CustomerLayout title="Terms of Service" showBack>
            <div className="bg-gray-50 min-h-screen">
                <div className="container-responsive py-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                        <h1 className="text-xl font-bold text-gray-900 mb-4">Terms of Service</h1>
                        <p className="text-gray-500 text-xs mb-4">Last updated: January 2026</p>

                        <div className="space-y-6 text-sm text-gray-700">
                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">1. Acceptance of Terms</h2>
                                <p>By accessing and using the TownBasket application, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">2. Services</h2>
                                <p>TownBasket provides a platform connecting local shops with customers for delivery of goods. We are an intermediary service and do not own or operate the shops listed on our platform.</p>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">3. User Accounts</h2>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>You must provide accurate information when creating an account</li>
                                    <li>You are responsible for maintaining account security</li>
                                    <li>You must be at least 18 years old to use our services</li>
                                    <li>One person may only have one customer account</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">4. Orders & Payments</h2>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>All orders are subject to availability</li>
                                    <li>Prices may vary and are set by individual shops</li>
                                    <li>Payment is required at the time of delivery (COD)</li>
                                    <li>Cancellations may be subject to penalties</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">5. Delivery</h2>
                                <p>Delivery times are estimates only. TownBasket is not liable for delays caused by factors beyond our control including weather, traffic, or shop delays.</p>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">6. Refunds & Returns</h2>
                                <p>Refund requests must be made within 24 hours of delivery. Perishable goods are non-refundable unless damaged or incorrect.</p>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">7. Prohibited Activities</h2>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Using the service for illegal purposes</li>
                                    <li>Creating fake accounts or orders</li>
                                    <li>Harassing delivery partners or shop staff</li>
                                    <li>Attempting to bypass security measures</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">8. Limitation of Liability</h2>
                                <p>TownBasket shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services.</p>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">9. Changes to Terms</h2>
                                <p>We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of modified terms.</p>
                            </section>

                            <section>
                                <h2 className="font-bold text-gray-900 mb-2">10. Contact</h2>
                                <p>For questions about these terms, contact us at legal@townbasket.com</p>
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
