from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_discovery_quiz(page: Page):
    page.goto("http://localhost:9002")

    # 1. Start the Palette Quiz
    page.get_by_text("Start Tasting").click()

    # Check if we are on quiz screen
    # Loop through palette questions to finish them
    # There are 7 questions in data.ts

    for _ in range(7):
        # Click the first option for each question to move fast
        # Assuming buttons are rendered
        time.sleep(0.5)
        page.locator("button").first.click()

    # Now we should be on 'results' screen
    # Look for "Refine Taste" button in RefineTaste component
    # The text on the button is "Refine Your Taste"

    time.sleep(1)

    try:
        page.get_by_text("Refine Your Taste").click()
    except:
        page.screenshot(path="verification/results_page_error.png")
        print("Could not find Refine button, check screenshot")
        return

    # Now we should be on 'discoveryQuiz' screen
    time.sleep(1)
    page.screenshot(path="verification/discovery_start.png")

    # Check for the first question
    expect(page.get_by_text("If your soul had a texture, what would it be?")).to_be_visible()

    # Click an option
    page.get_by_text("Polished Marble & Steel").click()

    # Check for the second question
    expect(page.get_by_text("Choose the setting for your perfect night.")).to_be_visible()

    page.screenshot(path="verification/discovery_q2.png")
    print("Verification successful")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_discovery_quiz(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_final.png")
        finally:
            browser.close()
