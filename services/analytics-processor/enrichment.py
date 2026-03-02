"""Event enrichment utilities."""

from typing import Optional, Dict, Any
from user_agents import parse as parse_user_agent


def enrich_user_agent(user_agent: str) -> Dict[str, Any]:
    """Parse user agent string and extract device/browser info."""
    if not user_agent:
        return {
            "device_type": "unknown",
            "device_brand": None,
            "device_model": None,
            "os_name": None,
            "os_version": None,
            "browser_name": None,
            "browser_version": None,
            "is_bot": False
        }
    
    ua = parse_user_agent(user_agent)
    
    if ua.is_mobile:
        device_type = "mobile"
    elif ua.is_tablet:
        device_type = "tablet"
    elif ua.is_pc:
        device_type = "desktop"
    elif ua.is_bot:
        device_type = "bot"
    else:
        device_type = "other"
    
    return {
        "device_type": device_type,
        "device_brand": ua.device.brand,
        "device_model": ua.device.model,
        "os_name": ua.os.family,
        "os_version": ua.os.version_string,
        "browser_name": ua.browser.family,
        "browser_version": ua.browser.version_string,
        "is_bot": 1 if ua.is_bot else 0
    }


def enrich_geo(ip_hash: str) -> Dict[str, Any]:
    """
    Enrich with geographic data.
    
    Note: In production, you would use a GeoIP database like MaxMind GeoLite2.
    Since we're working with hashed IPs for privacy, actual geo lookup isn't possible.
    This is a placeholder that would need IP-based lookup before hashing in redirect service.
    """
    return {
        "country_code": None,
        "country_name": None,
        "region": None,
        "city": None,
        "latitude": None,
        "longitude": None
    }


def enrich_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Enrich a click event with device and geo data."""
    ua_data = enrich_user_agent(event.get("user_agent", ""))
    
    geo_data = enrich_geo(event.get("ip_hash", ""))
    
    enriched = {
        **event,
        **ua_data,
        **geo_data
    }
    
    return enriched
