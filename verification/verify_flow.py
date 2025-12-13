from playwright.sync_api import sync_playwright

def verify_cocktail_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # 1. Start at Home
            page.goto("http://localhost:9002")
            # Text is "The Crystal Coupe" based on WelcomeScreen.tsx reading
            page.wait_for_selector("text=The Crystal Coupe")
            page.screenshot(path="verification/01_welcome.png")
            print("Captured Welcome Screen")

            # 2. Start Quiz
            page.click("text=Start Tasting")

            # --- PHASE 1: CALIBRATION ---
            # Q1: Coffee (Black) -> +X
            page.wait_for_selector("text=Phase 1: Calibration")
            page.click("text=Black or Espresso")

            # Q2: Dessert (Lemon Tart) -> +Y
            page.click("text=Lemon Tart (Zesty)")

            # Q3: Tonic (Love it) -> No Bitter Filter
            page.click("text=Love the bite")

            # --- PHASE 2: ARCHITECTURE ---
            # Q1: Texture (Fizzy)
            page.wait_for_selector("text=Phase 2: Architecture")
            page.click("text=Fizzy & Refreshing")

            # Q2: Weather (Heatwave)
            page.click("text=Heatwave (Need ice)")

            # Q3: Glassware (Stemmed)
            page.click("text=Stemmed & Elegant")

            # --- PHASE 3: CONTEXT ---
            # Q1: Smoke (No thanks) -> Filter Smoke
            page.wait_for_selector("text=Phase 3: Context")
            page.click("text=No thanks")

            # Q2: Licorice (Get away) -> Filter Anise
            page.click("text=Get them away")

            # Q3: Pacing (Crushable)
            page.click("text=Crushable & fast")

            # --- RESULTS ---
            page.wait_for_selector("text=The Palate Map")
            # Wait for API to load image (or skeleton to disappear)
            page.wait_for_timeout(5000)

            page.screenshot(path="verification/02_results.png")
            print("Captured Results Screen")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_cocktail_app()
