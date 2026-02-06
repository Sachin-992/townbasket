import { Component } from 'react'

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo)
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                        <span className="text-6xl mb-4 block">😕</span>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-gray-600 mb-6">
                            {this.props.fallbackMessage || 'Please try again or refresh the page.'}
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={this.handleRetry}
                                className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-4 rounded-xl font-semibold text-lg"
                            >
                                🔄 Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full border-2 border-gray-200 text-gray-700 py-4 rounded-xl font-semibold text-lg"
                            >
                                ↻ Refresh Page
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
