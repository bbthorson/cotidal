
import asyncio
from playwright.async_api import async_playwright, expect

async def verify_quiz_selection_state():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to the quiz page
        try:
            # Assuming the app runs on port 9002 based on package.json dev script
            await page.goto("http://localhost:9002")

            # Start the quiz (click Start/Begin button if there is one on home page)
            # The home page likely has a link/button to start the quiz
            # Let's check for a "Start" button or similar
            start_button = page.get_by_role("button", name="Start")
            if await start_button.is_visible():
                await start_button.click()
            else:
                # Maybe "Begin Discovery" or similar?
                # Let's try to find any button on the first page or assume we are on the quiz or navigated there
                # If page.tsx renders DiscoveryQuiz directly or after a simple click
                pass

            # Wait for quiz options to appear
            # The first question options should be visible
            # We look for a button with text "Black or Espresso" (from data.ts)
            option_a = page.get_by_role("button", name="Black or Espresso")
            await expect(option_a).to_be_visible(timeout=10000)

            # Click the option
            await option_a.click()

            # IMMEDIATELY check for the "active" state
            # The code adds class "opacity-100" and "ring-2" to the selected option
            # and "disabled" to all options.

            # We verify that option_a has the ring class or opacity-100 class
            # And that it is disabled
            await expect(option_a).to_be_disabled()

            # Check for the ring-2 class which indicates selection
            # Playwright's to_have_class can check for partial matches or we can check attribute
            # But the full class list is long (shadcn classes).
            # Let's get the class attribute and check content
            classes = await option_a.get_attribute("class")
            if "ring-2" not in classes or "opacity-100" not in classes:
                print(f"FAILED: Selected option does not have expected classes. Found: {classes}")
            else:
                print("SUCCESS: Selected option has 'ring-2' and 'opacity-100'.")

            # Take a screenshot to show the state (it lasts 200-800ms, so might be tricky to catch in screenshot but checking the DOM state is fast)
            await page.screenshot(path="verification/quiz_selection_state.png")

        except Exception as e:
            print(f"Error during verification: {e}")
            await page.screenshot(path="verification/error_state.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_quiz_selection_state())
