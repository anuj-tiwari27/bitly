"""QR Code generation utilities."""

import io
from typing import Optional, Tuple

import qrcode
from qrcode.constants import ERROR_CORRECT_L, ERROR_CORRECT_M, ERROR_CORRECT_Q, ERROR_CORRECT_H
from PIL import Image
import httpx

from schemas import QRStyleConfig

ERROR_CORRECTION_MAP = {
    "L": ERROR_CORRECT_L,
    "M": ERROR_CORRECT_M,
    "Q": ERROR_CORRECT_Q,
    "H": ERROR_CORRECT_H
}


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


async def download_logo(url: str, max_size: int = 1024 * 1024) -> Optional[Image.Image]:
    """Download and validate a logo image."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, follow_redirects=True, timeout=10.0)
            
            if response.status_code != 200:
                return None
            
            if len(response.content) > max_size:
                return None
            
            image = Image.open(io.BytesIO(response.content))
            return image.convert("RGBA")
    except Exception:
        return None


def generate_qr_code(
    data: str,
    style: QRStyleConfig,
    logo: Optional[Image.Image] = None
) -> Tuple[bytes, int, int, int]:
    """
    Generate a QR code image.
    
    Returns: (image_bytes, width, height, file_size)
    """
    error_correction = ERROR_CORRECTION_MAP.get(style.error_correction, ERROR_CORRECT_M)
    
    if logo:
        error_correction = ERROR_CORRECT_H
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=error_correction,
        box_size=style.box_size,
        border=style.border,
    )
    
    qr.add_data(data)
    qr.make(fit=True)
    
    fill_color = hex_to_rgb(style.fill_color)
    back_color = hex_to_rgb(style.back_color)
    
    img = qr.make_image(fill_color=fill_color, back_color=back_color)
    img = img.convert("RGBA")
    
    if logo:
        img = add_logo_to_qr(img, logo)
    
    buffer = io.BytesIO()
    img.save(buffer, format="PNG", optimize=True)
    image_bytes = buffer.getvalue()
    
    return image_bytes, img.width, img.height, len(image_bytes)


def add_logo_to_qr(qr_img: Image.Image, logo: Image.Image) -> Image.Image:
    """Add a logo to the center of a QR code."""
    qr_width, qr_height = qr_img.size
    
    logo_max_size = min(qr_width, qr_height) // 4
    
    logo_width, logo_height = logo.size
    ratio = min(logo_max_size / logo_width, logo_max_size / logo_height)
    new_width = int(logo_width * ratio)
    new_height = int(logo_height * ratio)
    
    logo = logo.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    logo_x = (qr_width - new_width) // 2
    logo_y = (qr_height - new_height) // 2
    
    white_bg = Image.new("RGBA", (new_width + 10, new_height + 10), (255, 255, 255, 255))
    qr_img.paste(white_bg, (logo_x - 5, logo_y - 5))
    
    qr_img.paste(logo, (logo_x, logo_y), logo)
    
    return qr_img


def generate_qr_svg(data: str, style: QRStyleConfig) -> Tuple[str, int]:
    """
    Generate a QR code as SVG.
    
    Returns: (svg_string, file_size)
    """
    import qrcode.image.svg
    
    error_correction = ERROR_CORRECTION_MAP.get(style.error_correction, ERROR_CORRECT_M)
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=error_correction,
        box_size=style.box_size,
        border=style.border,
    )
    
    qr.add_data(data)
    qr.make(fit=True)
    
    factory = qrcode.image.svg.SvgPathImage
    img = qr.make_image(
        image_factory=factory,
        fill_color=style.fill_color,
        back_color=style.back_color
    )
    
    buffer = io.BytesIO()
    img.save(buffer)
    svg_bytes = buffer.getvalue()
    
    return svg_bytes, len(svg_bytes)
