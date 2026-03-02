-- ===========================================
-- Bitly Platform - ClickHouse Analytics Schema
-- ===========================================

-- Create analytics database
CREATE DATABASE IF NOT EXISTS analytics;

USE analytics;

-- ===========================================
-- Click Events Table (Main analytics data)
-- ===========================================

CREATE TABLE IF NOT EXISTS click_events (
    event_id UUID DEFAULT generateUUIDv4(),
    link_id UUID,
    campaign_id Nullable(UUID),
    store_id Nullable(UUID),
    user_id Nullable(UUID),
    short_code String,
    destination_url String,
    
    -- Timestamp
    timestamp DateTime64(3) DEFAULT now64(3),
    date Date DEFAULT toDate(timestamp),
    
    -- Request info
    ip_hash String,
    user_agent String,
    referrer Nullable(String),
    
    -- Geo data (enriched)
    country_code Nullable(String),
    country_name Nullable(String),
    region Nullable(String),
    city Nullable(String),
    latitude Nullable(Float64),
    longitude Nullable(Float64),
    
    -- Device info (parsed from user agent)
    device_type Nullable(String),
    device_brand Nullable(String),
    device_model Nullable(String),
    os_name Nullable(String),
    os_version Nullable(String),
    browser_name Nullable(String),
    browser_version Nullable(String),
    is_bot UInt8 DEFAULT 0,
    
    -- UTM parameters
    utm_source Nullable(String),
    utm_medium Nullable(String),
    utm_campaign Nullable(String),
    utm_term Nullable(String),
    utm_content Nullable(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (link_id, timestamp)
TTL date + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;

-- ===========================================
-- Materialized Views for Fast Aggregations
-- ===========================================

-- Daily clicks per link
CREATE TABLE IF NOT EXISTS clicks_daily_by_link (
    date Date,
    link_id UUID,
    campaign_id Nullable(UUID),
    clicks UInt64,
    unique_visitors UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, link_id)
TTL date + INTERVAL 2 YEAR;

CREATE MATERIALIZED VIEW IF NOT EXISTS clicks_daily_by_link_mv
TO clicks_daily_by_link
AS SELECT
    date,
    link_id,
    campaign_id,
    count() as clicks,
    uniqExact(ip_hash) as unique_visitors
FROM click_events
GROUP BY date, link_id, campaign_id;

-- Daily clicks per campaign
CREATE TABLE IF NOT EXISTS clicks_daily_by_campaign (
    date Date,
    campaign_id UUID,
    clicks UInt64,
    unique_visitors UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, campaign_id)
TTL date + INTERVAL 2 YEAR;

CREATE MATERIALIZED VIEW IF NOT EXISTS clicks_daily_by_campaign_mv
TO clicks_daily_by_campaign
AS SELECT
    date,
    campaign_id,
    count() as clicks,
    uniqExact(ip_hash) as unique_visitors
FROM click_events
WHERE campaign_id IS NOT NULL
GROUP BY date, campaign_id;

-- Hourly clicks (for real-time dashboards)
CREATE TABLE IF NOT EXISTS clicks_hourly (
    hour DateTime,
    link_id UUID,
    clicks UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMMDD(hour)
ORDER BY (hour, link_id)
TTL hour + INTERVAL 30 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS clicks_hourly_mv
TO clicks_hourly
AS SELECT
    toStartOfHour(timestamp) as hour,
    link_id,
    count() as clicks
FROM click_events
GROUP BY hour, link_id;

-- Geographic breakdown
CREATE TABLE IF NOT EXISTS clicks_by_country (
    date Date,
    link_id UUID,
    country_code String,
    country_name String,
    clicks UInt64,
    unique_visitors UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, link_id, country_code)
TTL date + INTERVAL 1 YEAR;

CREATE MATERIALIZED VIEW IF NOT EXISTS clicks_by_country_mv
TO clicks_by_country
AS SELECT
    date,
    link_id,
    country_code,
    any(country_name) as country_name,
    count() as clicks,
    uniqExact(ip_hash) as unique_visitors
FROM click_events
WHERE country_code IS NOT NULL AND country_code != ''
GROUP BY date, link_id, country_code;

-- Device type breakdown
CREATE TABLE IF NOT EXISTS clicks_by_device (
    date Date,
    link_id UUID,
    device_type String,
    os_name String,
    browser_name String,
    clicks UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, link_id, device_type)
TTL date + INTERVAL 1 YEAR;

CREATE MATERIALIZED VIEW IF NOT EXISTS clicks_by_device_mv
TO clicks_by_device
AS SELECT
    date,
    link_id,
    ifNull(device_type, 'unknown') as device_type,
    ifNull(os_name, 'unknown') as os_name,
    ifNull(browser_name, 'unknown') as browser_name,
    count() as clicks
FROM click_events
GROUP BY date, link_id, device_type, os_name, browser_name;

-- Referrer breakdown
CREATE TABLE IF NOT EXISTS clicks_by_referrer (
    date Date,
    link_id UUID,
    referrer_domain String,
    clicks UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, link_id, referrer_domain)
TTL date + INTERVAL 1 YEAR;

CREATE MATERIALIZED VIEW IF NOT EXISTS clicks_by_referrer_mv
TO clicks_by_referrer
AS SELECT
    date,
    link_id,
    domain(ifNull(referrer, 'direct')) as referrer_domain,
    count() as clicks
FROM click_events
GROUP BY date, link_id, referrer_domain;

-- ===========================================
-- Helper Functions
-- ===========================================

-- Function to get link stats for a date range
-- Usage: SELECT * FROM link_stats_for_range('link-uuid', '2024-01-01', '2024-01-31')

-- ===========================================
-- Sample Queries (for reference)
-- ===========================================

-- Total clicks per campaign (last 30 days)
-- SELECT campaign_id, sum(clicks) as total_clicks
-- FROM clicks_daily_by_campaign
-- WHERE date >= today() - 30
-- GROUP BY campaign_id
-- ORDER BY total_clicks DESC;

-- Clicks over time for a specific link
-- SELECT hour, sum(clicks) as clicks
-- FROM clicks_hourly
-- WHERE link_id = 'your-link-uuid'
-- AND hour >= now() - INTERVAL 7 DAY
-- GROUP BY hour
-- ORDER BY hour;

-- Geographic breakdown for a link
-- SELECT country_name, sum(clicks) as clicks, sum(unique_visitors) as unique_visitors
-- FROM clicks_by_country
-- WHERE link_id = 'your-link-uuid'
-- AND date >= today() - 30
-- GROUP BY country_code, country_name
-- ORDER BY clicks DESC
-- LIMIT 10;

-- Device breakdown
-- SELECT device_type, sum(clicks) as clicks
-- FROM clicks_by_device
-- WHERE link_id = 'your-link-uuid'
-- AND date >= today() - 30
-- GROUP BY device_type;

-- Top referrers
-- SELECT referrer_domain, sum(clicks) as clicks
-- FROM clicks_by_referrer
-- WHERE link_id = 'your-link-uuid'
-- AND date >= today() - 30
-- GROUP BY referrer_domain
-- ORDER BY clicks DESC
-- LIMIT 10;
