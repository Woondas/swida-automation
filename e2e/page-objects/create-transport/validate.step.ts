import { Page, expect } from '@playwright/test';

interface WaypointValidationData {
  point_type?: 'Pickup' | 'Delivery';
  availabilityStart?: string;
  availabilityEnd?: string;
  inputs?: {
    name?: string;
    street?: string;
    city?: string;
    country?: string;
    zip?: string;
    postCode?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    reference?: string;
  };
}

interface CargoValidationData {
  inputs?: unknown;
  dropdowns?: unknown;
}

interface ReviewValidationData {
  inputs?: unknown;
  dropdowns?: unknown;
}

export class ValidateStep {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private log(message: string): void {
    console.log(`[validate] ${message}`);
  }

  private async _validate_block(block: import('@playwright/test').Locator, expected: unknown, label: string): Promise<void> {
    await expect(block).toBeVisible();

    const texts: string[] = [];
    const collect_values = (obj: Record<string, unknown>) => {
      for (const [, val] of Object.entries(obj)) {
        if (typeof val === 'string' && val.trim()) texts.push(val.trim());
        else if (val && typeof val === 'object') collect_values(val as Record<string, unknown>);
      }
    };

    collect_values(expected as Record<string, unknown>);
    const unique = Array.from(new Set(texts));
    for (const val of unique) {
      await expect(block).toContainText(val);
      this.log(`✓ ${label} contains: ${val}`);
    }
  }

  /**
   *  generic validation: validates that block contains all expected data
   */
  async validate_block(block_xpath: string, expected_data: unknown, label: string = 'Block'): Promise<void> {
    const block = this.page.locator(`xpath=${block_xpath}`).first();
    await this._validate_block(block, expected_data, label);
  }

  /**
   * validates that all given waypoint container values are visible on the page
   * @param container_index 0-based index of the container
   * @param expected_data expected data to assert
   */
  async waypoint(
    container_index: number,
    expected_data: WaypointValidationData
  ): Promise<void> {
    this.log(`Validating waypoint block (index=${container_index})`);

    const blocks = this.page.locator('.waypoints .pb-3');
    await expect(blocks.nth(container_index)).toBeVisible();
    const block = blocks.nth(container_index);

    // build a complete list of expected texts within the block (dates + inputs)
    const texts_to_verify: string[] = [];

    const collect_values = (obj: Record<string, unknown>): void => {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'string') {
          const trimmed = v.trim();
          if (trimmed.length > 0) {
            texts_to_verify.push(trimmed);
          }
        } else if (v && typeof v === 'object') {
          collect_values(v as Record<string, unknown>);
        }
      }
    };

    collect_values(expected_data as unknown as Record<string, unknown>);

    // remove duplicates for more stable assertions
    const unique_values = Array.from(new Set(texts_to_verify));

    for (const value of unique_values) {
      await expect(block).toContainText(value);
      this.log(`✓ waypoint contains: ${value}`);
    }
  }

  async click_and_wait_for_transport_request(button_name: string): Promise<number[]> {
    this.log(`Clicking submit button and waiting for API 'api/v1/transport-requests'`);

    const button = this.page.getByRole('button', { name: `${button_name}` }).first();
    await expect(button).toBeVisible();

    const [response] = await Promise.all([
      this.page.waitForResponse((resp) => {
        try {
          const { pathname } = new URL(resp.url());
          const normalizedPath = pathname.replace(/\/+$/, '');
          const isMatchingUrl = normalizedPath === '/api/v1/transport-requests';
          const isPost = resp.request().method().toUpperCase() === 'POST';
          return isMatchingUrl && isPost;
        } catch {
          return false;
        }
      }),
      button.click()
    ]);

    const status = response.status();
    this.log(`Create request response status: ${status}`);
    expect(status).toBe(200);

    const json = await response.json() as { auctions?: number[] };
    const auctions = Array.isArray(json?.auctions) ? json.auctions : [];
    this.log(`Auctions id: ${JSON.stringify(auctions)}`);

    return auctions;
  }

  /**
   * after clicking continue waits for /api/v1/transport-requests/validate and expects 400 with email error
   */
  async click_continue_and_expect_bad_eamil(email_error: string): Promise<void> {
    const [response] = await Promise.all([
      this.page.waitForResponse((res) => {
        try {
          const url = new URL(res.url());
          // accept any validate endpoint variant
          return /\/api\/v1\/transport-requests\/validate/.test(url.pathname);
        } catch {
          return false;
        }
      }),
      this.page.locator("//*[@id='button-step-Cargo info']").click(),
    ]);

    expect(response.status(), 'Expected 400 from validate endpoint').toBe(400);
    let body: any;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    expect(body, 'Response should be JSON').toBeTruthy();
    expect(Array.isArray(body.waypoints), 'body.waypoints should be an array').toBeTruthy();
    const waypoints: any[] = body.waypoints || [];
    const emailErrors = waypoints
      .map((wp) => wp?.contactEmail)
      .filter((errs: unknown) => !!errs);
    expect(emailErrors.length, 'at least one waypoint should have contactEmail errors').toBeGreaterThan(0);
    for (const errs of emailErrors) {
      if (Array.isArray(errs)) {
        expect(errs).toContain(email_error);
      } else {
        expect(String(errs)).toContain(email_error);
      }
    }
  }

  async click_and_verify_active_state(xpath: string): Promise<void> {
    this.log(`Clicking and verifying active element by XPath: ${xpath}`);
    const element = this.page.locator(`${xpath}`).first();
    await expect(element).toBeVisible();
    try { await element.scrollIntoViewIfNeeded(); } catch {}
    await element.click();
    await expect(element).toBeVisible();
    await expect(element).toHaveClass(/active/);
  }

  /**
   * verifies that a button with the given name is disabled
   */
  async verify_button_disabled_by_name(button_name: string): Promise<void> {
    this.log(`Verifying button '${button_name}' is disabled`);
    const button = this.page.getByRole('button', { name: button_name }).first();
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
  }

}
