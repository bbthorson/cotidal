
from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_sommelier_loader(page: Page):
    """
    Verifies that the 'Sommelier is thinking...' loading state appears
    with the newly added spinner.
    """
    # 1. Arrange: Inject a user profile to skip the quiz and land on Results Screen
    user_profile = {
        "x": 0,
        "y": 0,
        "dislikesSmoke": False,
        "dislikesBitter": False,
        "dislikesAnise": False,
        "vibeTags": {}
    }

    # We need to set localStorage before navigating
    page.goto("http://localhost:9002")
    page.evaluate(f"localStorage.setItem('user_profile', '{str(user_profile).replace('True', 'true').replace('False', 'false').replace('\'', '\"')}')")

    # 2. Go to the results page (Home component orchestrates this based on localStorage)
    page.goto("http://localhost:9002")

    # Wait for the results screen to load (DrinkCard should appear)
    # The first DrinkCard is the hero one with the 'Why this drink?' button
    button = page.get_by_role("button", name="Why this drink?")
    expect(button).to_be_visible(timeout=10000)

    # 3. Act: Click the button to trigger the loading state
    button.click()

    # 4. Assert: Check for the loading text
    # Note: We can't easily assert the SVG spinner is rotating in a static screenshot,
    # but we can verify the text changes and the button is disabled.
    loading_button = page.get_by_role("button", name="Sommelier is thinking...")
    expect(loading_button).to_be_visible()
    expect(loading_button).to_be_disabled()

    # Take a screenshot while it's loading
    # The AI call might fail or finish quickly, so we grab it immediately
    page.screenshot(path="/app/verification/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_sommelier_loader(page)
            print("Verification script completed successfully.")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="/app/verification/verification_failed.png")
            raise
        finally:
            browser.close()
