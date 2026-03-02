"""Tests for QR code generation."""

import pytest


def test_qr_code_generation_png():
    """Test PNG QR code generation."""
    import sys
    sys.path.insert(0, 'services/qr-service')
    from qr_generator import generate_qr_code
    
    qr_bytes = generate_qr_code(
        url="https://example.com",
        fill_color="#000000",
        back_color="#FFFFFF",
        box_size=10,
        border=2,
        format="PNG"
    )
    
    assert qr_bytes is not None
    assert len(qr_bytes) > 0
    # PNG magic bytes
    assert qr_bytes[:8] == b'\x89PNG\r\n\x1a\n'


def test_qr_code_generation_svg():
    """Test SVG QR code generation."""
    import sys
    sys.path.insert(0, 'services/qr-service')
    from qr_generator import generate_qr_code
    
    qr_bytes = generate_qr_code(
        url="https://example.com",
        fill_color="#000000",
        back_color="#FFFFFF",
        box_size=10,
        border=2,
        format="SVG"
    )
    
    assert qr_bytes is not None
    assert len(qr_bytes) > 0
    svg_content = qr_bytes.decode('utf-8')
    assert '<svg' in svg_content


def test_qr_code_custom_colors():
    """Test QR code with custom colors."""
    import sys
    sys.path.insert(0, 'services/qr-service')
    from qr_generator import generate_qr_code
    
    qr_bytes = generate_qr_code(
        url="https://example.com",
        fill_color="#FF0000",
        back_color="#00FF00",
        box_size=8,
        border=4,
        format="PNG"
    )
    
    assert qr_bytes is not None
    assert len(qr_bytes) > 0


def test_qr_code_different_sizes():
    """Test QR codes with different sizes."""
    import sys
    sys.path.insert(0, 'services/qr-service')
    from qr_generator import generate_qr_code
    
    small_qr = generate_qr_code(
        url="https://example.com",
        box_size=5,
        format="PNG"
    )
    
    large_qr = generate_qr_code(
        url="https://example.com",
        box_size=20,
        format="PNG"
    )
    
    assert len(large_qr) > len(small_qr)
