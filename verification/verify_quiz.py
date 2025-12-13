from playwright.sync_api import sync_playwright

def verify_discovery_quiz():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the home page
        page.goto("http://localhost:9002")

        # Click "Start Tasting"
        page.get_by_text("Start Tasting").click()

        # Wait for the quiz to load (Sensory Calibration)
        page.wait_for_selector("text=Sensory Calibration")

        # Take a screenshot of the sensory stage
        page.screenshot(path="verification/sensory_stage.png")

        # Answer all sensory questions to get to Vibe Check
        # There are 6 sensory questions
        for _ in range(6):
            # Just click the first option for each
            # The buttons are inside a grid, let's find the first button in the grid
            page.locator("button.h-auto").first.click()
            # Wait a bit for transition
            page.wait_for_timeout(1500)

        # Wait for Vibe Check stage
        page.wait_for_selector("text=Vibe Check")

        # Take a screenshot of the vibe stage
        page.screenshot(path="verification/vibe_stage.png")

        browser.close()

if __name__ == "__main__":
    verify_discovery_quiz()
