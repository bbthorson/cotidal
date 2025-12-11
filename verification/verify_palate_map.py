from playwright.sync_api import sync_playwright

def verify_palate_map():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            page.goto("http://localhost:9002")
            page.wait_for_timeout(2000)

            # Start Quiz
            start_button = page.get_by_role("button", name="Start")
            if start_button.is_visible():
                start_button.click()

            # Loop through questions.
            # Sensory: 6 questions
            # Discovery: 4 questions
            # Total 10 questions.

            for i in range(1, 15): # Loop plenty
                page.wait_for_timeout(1000)

                # Check if we are on results page
                if page.get_by_text("The Palate Map").is_visible():
                    print("Reached Results Page!")
                    break

                # Try to find standard buttons (Sensory)
                buttons = page.locator("button.h-auto") # The class from DiscoveryQuiz
                if buttons.count() > 0:
                     buttons.first.click()
                     print(f"Answered Sensory Q {i}")
                     continue

                # Try to find Vibe buttons (Image buttons)
                # They are <button> with images inside.
                # Locator: button with 'relative' and 'group' classes
                vibe_buttons = page.locator("button.relative.group")
                if vibe_buttons.count() > 0:
                     vibe_buttons.first.click()
                     print(f"Answered Vibe Q {i}")
                     continue

                # Fallback generic button
                generic_buttons = page.locator("button[type='button']")
                if generic_buttons.count() > 0:
                     generic_buttons.first.click()
                     print(f"Answered Generic Q {i}")
                else:
                    # Maybe it's just <button> without type button?
                    all_buttons = page.locator("button")
                    if all_buttons.count() > 0:
                         # Avoid clicking the "Start" button again if it's somehow visible
                         all_buttons.last.click()
                         print(f"Answered Fallback Q {i}")

            # Wait for results to load fully
            page.wait_for_timeout(3000)

            if page.get_by_text("The Palate Map").is_visible():
                # Take screenshot of the "Usual" context (Default)
                page.screenshot(path="verification/palate_map_usual.png")
                print("Captured Usual Context")

                # Click "Business" tab
                # Use get_by_role for tab if possible, or text
                business_tab = page.get_by_text("Business")
                if business_tab.is_visible():
                    business_tab.click()
                    page.wait_for_timeout(1000)
                    page.screenshot(path="verification/palate_map_business.png")
                    print("Captured Business Context")
                else:
                    print("Business tab not found")

                # Click "Holiday" tab
                holiday_tab = page.get_by_text("Holiday")
                if holiday_tab.is_visible():
                    holiday_tab.click()
                    page.wait_for_timeout(1000)
                    page.screenshot(path="verification/palate_map_holiday.png")
                    print("Captured Holiday Context")
                else:
                    print("Holiday tab not found")
            else:
                print("Did not reach results page.")
                page.screenshot(path="verification/stuck.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_palate_map()
