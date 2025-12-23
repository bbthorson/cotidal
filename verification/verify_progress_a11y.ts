import { chromium, Page } from '@playwright/test';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // 1. Go to homepage
    console.log('Navigating to homepage...');
    await page.goto('http://localhost:9002');

    // 2. Start Quiz
    console.log('Starting quiz...');
    await page.getByRole('button', { name: 'Start Tasting' }).click();

    // 3. Wait for progress bar
    console.log('Waiting for progress bar...');
    await page.waitForSelector('[role="progressbar"]');

    // 4. Verify ARIA attributes
    const progressBar = page.getByRole('progressbar');
    // Ensure it's ready
    await progressBar.waitFor();

    const ariaLabel = await progressBar.getAttribute('aria-label');
    const ariaValueText = await progressBar.getAttribute('aria-valuetext');

    console.log('aria-label:', ariaLabel);
    console.log('aria-valuetext:', ariaValueText);

    if (ariaLabel !== 'Quiz progress') {
      throw new Error(`Expected aria-label to be "Quiz progress", got "${ariaLabel}"`);
    }

    if (!ariaValueText?.match(/Question \d+ of \d+/)) {
      throw new Error(`Expected aria-valuetext to match "Question X of Y", got "${ariaValueText}"`);
    }

    // 5. Screenshot
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'verification/progress_a11y.png' });

    console.log('Verification passed!');

  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
