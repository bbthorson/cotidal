from playwright.sync_api import Page, expect, sync_playwright
import json

def verify_map_pins(page: Page):
    # 1. Inject a user profile to bypass the quiz
    user_profile = {
        "x": 0,
        "y": 0,
        "dislikesSmoke": False,
        "dislikesBitter": False,
        "dislikesAnise": False,
        "filters": [],
        "vibeTags": { "social": 5, "classic": 3 }
    }

    # We need to set localStorage before the page logic runs or refresh after.
    # Easiest is to go to page, set storage, reload.
    page.goto("http://localhost:9002")

    page.evaluate(f"localStorage.setItem('user_profile', '{json.dumps(user_profile)}');")
    page.reload()

    # 2. Wait for map pins
    # The pins are buttons inside tooltips.
    # They have aria-labels like "Select Aperol Spritz, Cocktail"
    # We can wait for one to appear.

    # Wait for heading to ensure we are on Results screen
    expect(page.get_by_role("heading", name="The Palate Map")).to_be_visible(timeout=10000)

    # Find a pin (button)
    # Based on data.ts, Aperol Spritz is in the DB.
    # Note: recommendations might change based on logic, but with 0,0 user, we should get *some* results.
    # Let's just look for *any* button in the map container.
    # The map container has class "aspect-square".

    # Let's find a pin button.
    # "Select [Drink Name], [Drink Type]"
    # Let's wait for at least one such button.

    # We can try to hover the first pin we find.
    pin = page.locator("button[aria-label^='Select ']").first
    expect(pin).to_be_visible()

    # Hover to trigger the optimization logic (state change)
    pin.hover()

    # Wait a tiny bit for transition
    page.wait_for_timeout(500)

    # 3. Screenshot
    page.screenshot(path="verification/map_optimization.png")
    print("Screenshot saved to verification/map_optimization.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_map_pins(page)
        except Exception as e:
            print(f"Error: {e}")
            # Take screenshot on error too
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()
