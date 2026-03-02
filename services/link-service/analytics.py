"""ClickHouse analytics queries for Link service."""

from datetime import datetime, timedelta
from typing import Dict, List, Any
from uuid import UUID

from clickhouse_driver import Client

from config import get_settings

settings = get_settings()


def get_clickhouse_client() -> Client:
    """Get ClickHouse client."""
    return Client(
        host=settings.clickhouse_host,
        port=settings.clickhouse_port,
        user=settings.clickhouse_user,
        password=settings.clickhouse_password,
        database=settings.clickhouse_db
    )


class LinkAnalytics:
    """Analytics queries for links."""
    
    def __init__(self):
        self.client = get_clickhouse_client()
    
    def get_link_stats(self, link_id: UUID) -> Dict[str, Any]:
        """Get comprehensive stats for a link."""
        link_id_str = str(link_id)
        
        now = datetime.utcnow()
        today = now.date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        stats = {
            "link_id": link_id,
            "total_clicks": 0,
            "unique_visitors": 0,
            "clicks_today": 0,
            "clicks_this_week": 0,
            "clicks_this_month": 0,
            "top_countries": [],
            "top_referrers": [],
            "device_breakdown": {},
            "browser_breakdown": {},
            "clicks_over_time": []
        }
        
        try:
            # Total clicks and unique visitors
            result = self.client.execute(
                """
                SELECT 
                    count() as total_clicks,
                    uniqExact(ip_hash) as unique_visitors
                FROM click_events
                WHERE link_id = %(link_id)s
                """,
                {"link_id": link_id_str}
            )
            if result:
                stats["total_clicks"] = result[0][0]
                stats["unique_visitors"] = result[0][1]
            
            # Clicks today
            result = self.client.execute(
                """
                SELECT count() FROM click_events
                WHERE link_id = %(link_id)s AND date = %(today)s
                """,
                {"link_id": link_id_str, "today": today}
            )
            if result:
                stats["clicks_today"] = result[0][0]
            
            # Clicks this week
            result = self.client.execute(
                """
                SELECT count() FROM click_events
                WHERE link_id = %(link_id)s AND date >= %(week_ago)s
                """,
                {"link_id": link_id_str, "week_ago": week_ago}
            )
            if result:
                stats["clicks_this_week"] = result[0][0]
            
            # Clicks this month
            result = self.client.execute(
                """
                SELECT count() FROM click_events
                WHERE link_id = %(link_id)s AND date >= %(month_ago)s
                """,
                {"link_id": link_id_str, "month_ago": month_ago}
            )
            if result:
                stats["clicks_this_month"] = result[0][0]
            
            # Top countries
            result = self.client.execute(
                """
                SELECT 
                    country_code,
                    country_name,
                    count() as clicks,
                    uniqExact(ip_hash) as unique_visitors
                FROM click_events
                WHERE link_id = %(link_id)s AND country_code != ''
                GROUP BY country_code, country_name
                ORDER BY clicks DESC
                LIMIT 10
                """,
                {"link_id": link_id_str}
            )
            stats["top_countries"] = [
                {"country_code": r[0], "country_name": r[1], "clicks": r[2], "unique_visitors": r[3]}
                for r in result
            ]
            
            # Top referrers
            result = self.client.execute(
                """
                SELECT 
                    domain(ifNull(referrer, 'direct')) as referrer_domain,
                    count() as clicks
                FROM click_events
                WHERE link_id = %(link_id)s
                GROUP BY referrer_domain
                ORDER BY clicks DESC
                LIMIT 10
                """,
                {"link_id": link_id_str}
            )
            stats["top_referrers"] = [
                {"referrer": r[0] or "direct", "clicks": r[1]}
                for r in result
            ]
            
            # Device breakdown
            result = self.client.execute(
                """
                SELECT 
                    ifNull(device_type, 'unknown') as device,
                    count() as clicks
                FROM click_events
                WHERE link_id = %(link_id)s
                GROUP BY device
                """,
                {"link_id": link_id_str}
            )
            stats["device_breakdown"] = {r[0]: r[1] for r in result}
            
            # Browser breakdown
            result = self.client.execute(
                """
                SELECT 
                    ifNull(browser_name, 'unknown') as browser,
                    count() as clicks
                FROM click_events
                WHERE link_id = %(link_id)s
                GROUP BY browser
                """,
                {"link_id": link_id_str}
            )
            stats["browser_breakdown"] = {r[0]: r[1] for r in result}
            
            # Clicks over time (last 30 days, daily)
            result = self.client.execute(
                """
                SELECT 
                    date,
                    count() as clicks
                FROM click_events
                WHERE link_id = %(link_id)s AND date >= %(month_ago)s
                GROUP BY date
                ORDER BY date
                """,
                {"link_id": link_id_str, "month_ago": month_ago}
            )
            stats["clicks_over_time"] = [
                {"date": r[0].isoformat(), "clicks": r[1]}
                for r in result
            ]
            
        except Exception as e:
            # If ClickHouse is not available, return empty stats
            pass
        
        return stats
    
    def get_clicks_hourly(self, link_id: UUID, hours: int = 24) -> List[Dict[str, Any]]:
        """Get hourly click data."""
        link_id_str = str(link_id)
        start_time = datetime.utcnow() - timedelta(hours=hours)
        
        try:
            result = self.client.execute(
                """
                SELECT 
                    toStartOfHour(timestamp) as hour,
                    count() as clicks
                FROM click_events
                WHERE link_id = %(link_id)s AND timestamp >= %(start_time)s
                GROUP BY hour
                ORDER BY hour
                """,
                {"link_id": link_id_str, "start_time": start_time}
            )
            return [{"hour": r[0].isoformat(), "clicks": r[1]} for r in result]
        except Exception:
            return []
