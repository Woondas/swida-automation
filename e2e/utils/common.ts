import { Page, expect } from '@playwright/test';

/**
 * ensures provided string is a playwright xpath selector (adds "xpath=" prefix if missing)
 */
function to_xpath_selector(xpath: string): string {
  return xpath.startsWith('xpath=') ? xpath : `xpath=${xpath}`;
}

/**
 * returns a random integer between min and max (both inclusive)
 */
function get_random_int_inclusive(min: number, max: number): number {
  const min_normalized = Math.ceil(min);
  const max_normalized = Math.floor(max);
  return Math.floor(Math.random() * (max_normalized - min_normalized + 1)) + min_normalized;
}

/**
 * Clicks a dropdown and selects a random option
 * Returns the selected option text for later assertions
 */
export async function select_random_from_dropdown(
  page: Page,
  inputXpath: string,
  optionsXpath: string,
  logTag: string = 'common',
): Promise<string> {
  const prefix = logTag ? `[${logTag}]` : '[common]';
  console.log(`${prefix} Trying to open dropdown via: ${inputXpath}`);
  const opener = page.locator(to_xpath_selector(inputXpath)).first();
  const openerExists = await opener.count() > 0;
  if (openerExists) {
    await opener.waitFor({ state: 'visible', timeout: 15000 });
    await opener.scrollIntoViewIfNeeded();
    await opener.click({ timeout: 10000 });
  } else {
    console.log(`${prefix} No opener found – assuming dropdown already visible`);
  }

  const options = page.locator(to_xpath_selector(optionsXpath));
  await options.first().waitFor({ state: 'visible', timeout: 10000 });
  const count = await options.count();
  console.log(`${prefix} Dropdown options: ${count}`);
  if (count === 0) {
    throw new Error(`${prefix} No dropdown options for XPath: ${optionsXpath}`);
  }

  const index = get_random_int_inclusive(0, count - 1);
  const option = options.nth(index);
  const raw = (await option.innerText()).trim();
  const selectedText = raw
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)[0] || raw;
  console.log(`${prefix} Selecting option #${index}: ${selectedText}`);
  await option.click({ timeout: 10000 });
  // close dropdown
  try { await page.keyboard.press('Escape'); } catch {}
  try { await options.first().waitFor({ state: 'hidden', timeout: 3000 }); } catch {}
  console.log(`${prefix} Dropdown closed`);
  return selectedText;
}

/**
 * fills input by element id and submits enter. optional log tag to prefix logs
 */
export async function fill_by_id(
  page: Page,
  fieldId: string,
  value: string,
  logTag?: string,
): Promise<void> {
const prefix = logTag ? `[${logTag}]` : '[common]';
  console.log(`${prefix} Filling id='${fieldId}' with '${value}'`);
  const input = page.locator(`//*[@id="${fieldId}"]`);
  await input.fill(value);
  await input.press('Enter');
}

/**
 * verifies required fields and their validation messages on current step
 *
 * - finds all labels with classes 'form-label d-block required'
 * - reads the 'for' attribute (e.g. waypoints[0].city)
 * - asserts there is a visible validation message for the corresponding field
 *
 * note: works for the page structure where label is followed by input/div and a sibling validation message
 */
export async function assert_required_fields_have_errors(page: Page): Promise<void> {
  const prefix = '[validation]';
  // find all required labels
  const requiredLabels = page.locator(
    "//label[contains(@class,'form-label') and contains(@class,'required') and @for]"
  );
  const count = await requiredLabels.count();
  console.log(`${prefix} Required labels found: ${count}`);

  for (let i = 0; i < count; i++) {
    const label = requiredLabels.nth(i);
    const fieldFor = await label.getAttribute('for');
    const fieldText = (await label.innerText()).trim();
    if (!fieldFor) {
      console.log(`${prefix} Skipping label without 'for' at index ${i}`);
      continue;
    }
    // verify a visible validation message exists for the field
    const errorLocator = page.locator(
      `//*[@*='${fieldFor}']/following-sibling::*[@class='validation-message']/p[not(@style='display: none;')]`
    );
    console.log(`${prefix} Checking error for field '${fieldFor}' (${fieldText})`);
    await expect(errorLocator.first(), `${prefix} expected validation message for '${fieldFor}'`).toBeVisible();
  }
}
