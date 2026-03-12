"""Tests for QR code generation."""

import sys
import importlib.util
from pathlib import Path

_qr_service_dir = Path(__file__).resolve().parent.parent / "services" / "qr-service"

import pytest


def _load_qr_module(name):
    """Load a module from qr-service directory to avoid schema conflicts."""
    # Clear cached schemas from other services
    for k in list(sys.modules):
        if k == "schemas" or k.startswith("qr_"):
            del sys.modules[k]
    path = _qr_service_dir / f"{name}.py"
    spec = importlib.util.spec_from_file_location(f"qr_{name}", path)
    mod = importlib.util.module_from_spec(spec)
    qr_path = str(_qr_service_dir)
    sys.path.insert(0, qr_path)
    try:
        spec.loader.exec_module(mod)
        return mod
    finally:
        if qr_path in sys.path:
            sys.path.remove(qr_path)


def test_qr_code_generation_png():
    """Test PNG QR code generation."""
    qr_gen = _load_qr_module("qr_generator")
    generate_qr_code = qr_gen.generate_qr_code
    QRStyleConfig = qr_gen.QRStyleConfig

    style = QRStyleConfig(
        fill_color="#000000",
        back_color="#FFFFFF",
        box_size=10,
        border=2,
    )
    image_bytes, width, height, file_size = generate_qr_code(
        data="https://example.com",
        style=style,
    )

    assert image_bytes is not None
    assert len(image_bytes) > 0
    # PNG magic bytes
    assert image_bytes[:8] == b'\x89PNG\r\n\x1a\n'
    assert width > 0
    assert height > 0


def test_qr_code_generation_svg():
    """Test SVG QR code generation."""
    qr_gen = _load_qr_module("qr_generator")
    generate_qr_svg = qr_gen.generate_qr_svg
    QRStyleConfig = qr_gen.QRStyleConfig

    style = QRStyleConfig(
        fill_color="#000000",
        back_color="#FFFFFF",
        box_size=10,
        border=2,
    )
    svg_bytes, file_size = generate_qr_svg(
        data="https://example.com",
        style=style,
    )

    assert svg_bytes is not None
    assert len(svg_bytes) > 0
    svg_content = svg_bytes.decode('utf-8') if isinstance(svg_bytes, bytes) else svg_bytes
    assert '<svg' in svg_content


def test_qr_code_custom_colors():
    """Test QR code with custom colors."""
    qr_gen = _load_qr_module("qr_generator")
    generate_qr_code = qr_gen.generate_qr_code
    QRStyleConfig = qr_gen.QRStyleConfig

    style = QRStyleConfig(
        fill_color="#FF0000",
        back_color="#00FF00",
        box_size=8,
        border=4,
    )
    image_bytes, _, _, _ = generate_qr_code(
        data="https://example.com",
        style=style,
    )

    assert image_bytes is not None
    assert len(image_bytes) > 0


def test_qr_code_different_sizes():
    """Test QR codes with different sizes."""
    qr_gen = _load_qr_module("qr_generator")
    generate_qr_code = qr_gen.generate_qr_code
    QRStyleConfig = qr_gen.QRStyleConfig

    small_style = QRStyleConfig(box_size=5)
    large_style = QRStyleConfig(box_size=20)

    small_qr, _, _, small_size = generate_qr_code(
        data="https://example.com",
        style=small_style,
    )
    large_qr, _, _, large_size = generate_qr_code(
        data="https://example.com",
        style=large_style,
    )

    assert len(large_qr) > len(small_qr)
    assert large_size > small_size
