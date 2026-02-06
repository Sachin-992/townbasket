import { useState, useRef } from 'react'
import { storageApi } from '../../lib/api'

export default function ImageUploader({
    onUpload,
    currentImage = null,
    bucket = 'products',
    folder = '',
    label = 'Upload Image',
    className = ''
}) {
    const [uploading, setUploading] = useState(false)
    const [preview, setPreview] = useState(currentImage)
    const [error, setError] = useState('')
    const fileInputRef = useRef(null)

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if (!validTypes.includes(file.type)) {
            setError('Please select a valid image (JPEG, PNG, WebP, or GIF)')
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB')
            return
        }

        setError('')
        setUploading(true)

        try {
            // Create preview
            const reader = new FileReader()
            reader.onload = (e) => setPreview(e.target.result)
            reader.readAsDataURL(file)

            // Upload to Supabase Storage
            const { url } = await storageApi.uploadImage(file, bucket, folder)

            // Call parent callback with URL
            if (onUpload) {
                onUpload(url)
            }
        } catch (err) {
            console.error('Upload error:', err)
            setError(err.message || 'Failed to upload image')
            setPreview(currentImage) // Revert preview
        } finally {
            setUploading(false)
        }
    }

    const handleRemove = () => {
        setPreview(null)
        if (onUpload) {
            onUpload(null)
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
            </label>

            <div className="relative">
                {preview ? (
                    /* Preview with remove button */
                    <div className="relative rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300">
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-48 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-white text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                            >
                                Change
                            </button>
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                        {uploading && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                ) : (
                    /* Upload button */
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full h-48 rounded-xl border-2 border-dashed border-gray-300 hover:border-emerald-400 bg-gray-50 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {uploading ? (
                            <>
                                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm text-gray-500">Uploading...</span>
                            </>
                        ) : (
                            <>
                                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <span className="text-emerald-600 font-medium">Click to upload</span>
                                    <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP up to 5MB</p>
                                </div>
                            </>
                        )}
                    </button>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
        </div>
    )
}
