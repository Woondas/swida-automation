import { Page, expect } from '@playwright/test';

/**
 * page object for the carriers selection step
 */
export class CarriersStep {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private log(message: string): void {
    console.log(`[carriers] ${message}`);
  }

  async verify_on_carriers_step(): Promise<void> {
    this.log('Verifying active step is carriers');
    const tab = this.page.locator('//button[@id="button-step-Carriers"]');
    await expect(tab).toBeVisible();
    await expect(tab).toHaveClass(/active/);
  }

  /**
   * checks a carrier checkbox by its input id
   */
  async check_carrier_by_id(input_id: string | number): Promise<void> {
    const id_str = String(input_id);
    this.log(`Checking carrier checkbox by id: ${id_str}`);
    const checkbox = this.page.locator(`//input[@id='${id_str}']`);
    await checkbox.waitFor({ state: 'visible', timeout: 10000 });
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  }
}
