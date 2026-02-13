"""
File upload validation utilities for TownBasket.
"""
import os
import re
import uuid
from django.conf import settings
from rest_framework.exceptions import ValidationError


ALLOWED_IMAGE_TYPES = getattr(settings, 'ALLOWED_IMAGE_TYPES', [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif'
])

MAX_UPLOAD_SIZE = getattr(settings, 'MAX_UPLOAD_SIZE_BYTES', 5 * 1024 * 1024)  # 5 MB

# Magic bytes for image validation
IMAGE_SIGNATURES = {
    b'\xff\xd8\xff': 'image/jpeg',
    b'\x89PNG': 'image/png',
    b'GIF87a': 'image/gif',
    b'GIF89a': 'image/gif',
    b'RIFF': 'image/webp',  # WebP starts with RIFF
}


def validate_upload_file(file):
    """
    Validate an uploaded file for:
    - File size limit
    - MIME type (content_type)
    - Magic bytes (actual file content)
    - Filename sanitization
    
    Returns sanitized filename.
    Raises ValidationError if invalid.
    """
    # 1. Size check
    if file.size > MAX_UPLOAD_SIZE:
        max_mb = MAX_UPLOAD_SIZE / (1024 * 1024)
        raise ValidationError(
            f'File too large. Maximum size is {max_mb:.0f} MB. '
            f'Uploaded file is {file.size / (1024 * 1024):.1f} MB.'
        )

    # 2. MIME type check (from upload headers)
    content_type = getattr(file, 'content_type', '')
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise ValidationError(
            f'Invalid file type: {content_type}. '
            f'Allowed types: {", ".join(ALLOWED_IMAGE_TYPES)}'
        )

    # 3. Magic bytes check (actual file content)
    file.seek(0)
    header = file.read(8)
    file.seek(0)
    
    is_valid_image = False
    for signature, mime in IMAGE_SIGNATURES.items():
        if header.startswith(signature):
            is_valid_image = True
            break
    
    if not is_valid_image:
        raise ValidationError(
            'File content does not match a valid image format. '
            'Only JPEG, PNG, WebP, and GIF are allowed.'
        )

    # 4. Sanitize filename
    original_name = getattr(file, 'name', 'upload')
    ext = os.path.splitext(original_name)[1].lower()
    
    if ext not in ('.jpg', '.jpeg', '.png', '.webp', '.gif'):
        ext = '.jpg'
    
    sanitized_name = f"{uuid.uuid4().hex}{ext}"
    
    return sanitized_name


def sanitize_text_input(text, max_length=1000):
    """
    Sanitize text input by:
    - Stripping leading/trailing whitespace
    - Truncating to max_length
    - Removing null bytes
    - Removing excessive whitespace
    """
    if not text:
        return text
    
    text = str(text).strip()
    text = text.replace('\x00', '')  # Remove null bytes
    text = re.sub(r'\s+', ' ', text)  # Collapse whitespace
    text = text[:max_length]
    
    return text
