import { Page , expect} from '@playwright/test';

export interface ReviewData {
  inputs?: Record<string, string | undefined>;
  dropdowns?: Record<string, string | undefined>;
}

export interface ReviewResolvedData {
  inputs?: Record<string, string | undefined>;
  dropdowns?: Record<string, string | undefined>;
}

/**
 * page object for the review step (confirmation/verification)
 */
export class ReviewStep {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }
  private log(message: string): void {
    console.log(`[review] ${message}`);
  }

  async verify_on_review_step(): Promise<void> {
    this.log('Verifying active step is review');
    const input_locator = this.page.locator('//button[@id="button-step-Review"]');
    await expect(input_locator).toBeVisible();
    await expect(input_locator).toHaveClass(/active/);
  }

  /**
   * typically only confirmation happens here; if there are fields
   * allow parametrized filling similar to cargo/waypoints
   */
  async fill_review(data: ReviewData): Promise<ReviewResolvedData> {
    this.log('Filling review step (if applicable)');

    const resolved: ReviewResolvedData = {};

    // inputs: key is taken directly as the element id
    for (const [key, value] of Object.entries(data.inputs || {})) {
      if (!value) continue;
      const input_locator = this.page.locator(`//*[@id="${key}"]`);
      await input_locator.fill(String(value));
      await input_locator.press('Enter');
    }
    if (data.inputs) resolved.inputs = { ...data.inputs };

    // dropdowns: key is taken directly as the element id
    for (const [key, choice] of Object.entries(data.dropdowns || {})) {
      if (!choice) continue;
      // if review dropdowns appear in future, a helper similar to cargo can be added
      // placeholder to keep the return structure consistent
      resolved.dropdowns = { ...(resolved.dropdowns || {}), [key]: choice };
    }

    return resolved;
  }
}