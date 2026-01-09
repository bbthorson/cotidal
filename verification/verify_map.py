from playwright.sync_api import sync_playwright

def verify_map_background():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        page.goto("http://localhost:9002")

        # Inject user profile to bypass the quiz and go straight to ResultsScreen
        page.evaluate("""
            localStorage.setItem('user_profile', JSON.stringify({
              x: 5,
              y: 5,
              dislikesSmoke: false,
              dislikesBitter: false,
              dislikesAnise: false,
              vibeTags: {'social': 1, 'visual': 1}
            }));
        """)

        # Reload to trigger the "finalResults" state
        page.reload()

        # Wait for the Results Screen heading
        page.wait_for_selector("h1:has-text('The Palate Revelation')")

        # Wait for the map to render (grid lines and axis labels are now in MapBackground)
        # We check for a specific axis label text
        page.wait_for_selector("text=RICH")
        page.wait_for_selector("text=CRISP")

        # Take a screenshot
        page.screenshot(path="verification/results_screen_map.png")

        print("Screenshot taken: verification/results_screen_map.png")
        browser.close()

if __name__ == "__main__":
    verify_map_background()
