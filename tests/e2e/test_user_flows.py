"""End-to-end tests for user flows."""

import pytest
from playwright.async_api import async_playwright, expect

BASE_URL = "http://localhost:3000"


@pytest.fixture
async def browser():
    """Create a browser instance."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        yield browser
        await browser.close()


@pytest.fixture
async def page(browser):
    """Create a new page."""
    context = await browser.new_context()
    page = await context.new_page()
    yield page
    await context.close()


@pytest.mark.asyncio
async def test_landing_page_loads(page):
    """Test that the landing page loads correctly."""
    await page.goto(BASE_URL)
    
    await expect(page).to_have_title("Retail Link Intelligence")
    
    await expect(page.locator("text=Get Started")).to_be_visible()


@pytest.mark.asyncio
async def test_login_page_navigation(page):
    """Test navigation to login page."""
    await page.goto(BASE_URL)
    
    await page.click("text=Sign In")
    
    await expect(page).to_have_url(f"{BASE_URL}/login")
    
    await expect(page.locator("input[type='email']")).to_be_visible()
    await expect(page.locator("input[type='password']")).to_be_visible()


@pytest.mark.asyncio
async def test_register_page_navigation(page):
    """Test navigation to register page."""
    await page.goto(f"{BASE_URL}/login")
    
    await page.click("text=Create an account")
    
    await expect(page).to_have_url(f"{BASE_URL}/register")


@pytest.mark.asyncio
async def test_login_validation(page):
    """Test login form validation."""
    await page.goto(f"{BASE_URL}/login")
    
    await page.fill("input[type='email']", "invalid-email")
    await page.fill("input[type='password']", "123")
    
    await page.click("button[type='submit']")


@pytest.mark.asyncio
async def test_registration_flow(page):
    """Test user registration flow."""
    await page.goto(f"{BASE_URL}/register")
    
    import uuid
    unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    
    await page.fill("input[name='first_name']", "Test")
    await page.fill("input[name='last_name']", "User")
    await page.fill("input[type='email']", unique_email)
    await page.fill("input[type='password']", "SecurePassword123!")
    await page.fill("input[name='confirm_password']", "SecurePassword123!")
    
    # Note: Form submission would require running backend


@pytest.mark.asyncio
async def test_dashboard_requires_auth(page):
    """Test that dashboard redirects unauthenticated users."""
    await page.goto(f"{BASE_URL}/dashboard")
    
    # Should redirect to login
    await page.wait_for_url(f"{BASE_URL}/login*", timeout=5000)


@pytest.mark.asyncio  
async def test_create_link_page_elements(page):
    """Test create link page has required elements."""
    # This would require authentication first
    pass


@pytest.mark.asyncio
async def test_qr_code_preview(page):
    """Test QR code preview functionality."""
    # This would require authentication and an existing link
    pass
