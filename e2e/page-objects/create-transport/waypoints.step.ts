import { Page, expect } from '@playwright/test';

// data types for a clear api when working with waypoints
type TripType = 'ONE_WAY' | 'ROUND_TRIP';
type TransportMode = 'road' | 'plane' | 'ship' | 'train' | 'truck-plane';
type PointType = 'Pickup' | 'Delivery';
type WaypointFieldKey =
  | 'name'
  | 'street'
  | 'city'
  | 'country'
  | 'zip'
  | 'postCode'
  | 'contactName'
  | 'contactEmail'
  | 'contactPhone'
  | 'reference';

interface WaypointContainerInputs {
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
}

interface WaypointContainerData {
  point_type?: PointType;
  availabilityStartOffset?: number;
  availabilityEndOffset?: number;
  inputs?: WaypointContainerInputs;
  dropdowns?: {
    country?: string;
  };
}

/**
 * page object for the waypoints (route) step
 */
export class WaypointsStep {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // log helper for consistent waypoint logs
  private log(message: string): void {
    console.log(`[waypoints] ${message}`);
  }

  async verify_on_waypoints_step(): Promise<void> {
    this.log('Verifying active step is waypoints');
    const tab = this.page.locator('//button[@id="button-step-Waypoints"]');
    await expect(tab).toBeVisible();
    await expect(tab).toHaveClass(/active/);
  }

  /**
   * computes and returns a formatted date based on a day offset from today
   * format: "dd.MM.yyyy HH:mm"
   */
  format_date_from_offset(days_offset: number, base: Date = new Date()): string {
    const target = new Date(base);
    target.setDate(base.getDate() + days_offset);

    const dd = String(target.getDate()).padStart(2, '0');
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const yyyy = target.getFullYear();
    const HH = String(target.getHours()).padStart(2, '0');
    const Min = String(target.getMinutes()).padStart(2, '0');

    return `${dd}.${mm}.${yyyy} ${HH}:${Min}`;
  }

  /**
   * Selects route type (ONE_WAY or ROUND_TRIP)
   */
  async select_route_type(value: TripType): Promise<void> {
    this.log(`Selecting route type: ${value}`);
    const radio = this.page.locator(`xpath=//input[@type='radio' and @value='${value}']`);
    await radio.waitFor({ state: 'visible', timeout: 10000 });
    await radio.check();
  }

  /**
   * selects waypoint point type (pickup/delivery) based on radio group name
   *
   * index: 0-based index of waypoint container on the page
   * - each waypoint block has two radios with the same `name="waypoints[index].type"`
   * - we select by position: nth(0) = pickup point, nth(1) = delivery point
   */
  async select_trip_type(container_index: number, point_type: PointType): Promise<void> {
    const label = point_type === 'Pickup' ? 'Pickup point' : 'Delivery point';
    this.log(`Selecting waypoint type: ${label} (index: ${container_index})`);
    const radios = this.page.locator(`//input[@name="waypoints[${container_index}].type"]`);
    const position = point_type === 'Pickup' ? 0 : 1;
    await radios.nth(position).check();
  }

  /**
   * sets the calendar date based on day offset
   *
   * index: 0-based container index
   * days_offset: number of days from today (0=today, 1=tomorrow, -1=yesterday)
   * format: "dd.MM.yyyy HH:mm" (e.g., 30.08.2025 17:10)
   * availability_field: 'availabilityStart' (earliest) or 'availabilityEnd' (latest)
   * target input is defined by xpath based on availability_field
   */
  async set_calendar_date(
    container_index: number,
    days_offset: number,
    availability_field: 'availabilityStart' | 'availabilityEnd' = 'availabilityStart',
  ): Promise<string> {
    const formatted = this.format_date_from_offset(days_offset);
    this.log(
      `Setting calendar date (${availability_field}) for waypoint container ${container_index}: ${formatted} (offset days: ${days_offset})`
    );

    const input = this.page.locator(
      `//label[@for="waypoints[${container_index}].${availability_field}"]/following-sibling::div//input`
    );
    await input.fill(formatted);
    // close date picker by clicking cancel action button to apply value
    const close_btn = this.page.locator(
      `//label[@for="waypoints[${container_index}].${availability_field}"]/following-sibling::div//button[contains(@class,'dp__action_button') and contains(@class,'dp__action_cancel') and @type='button']`
    );
    await close_btn.click();
    return formatted;
  }

  /**
   * selects transport mode by clicking the fontawesome icons parent element
   * @param mode 'road' | 'plane' | 'ship' | 'train' | 'truck-plane'
   */
  async select_transport_mode(mode: TransportMode): Promise<void> {
    this.log(`Selecting transport mode: ${mode}`);
    // xpath: find <i> with the class and click its parent button/div
    const icon_locator = this.page.locator(`//i[contains(@class,'fa-${mode}')]`);
    await icon_locator.first().locator('..').click();
  }

  /**
   * selects a random country from the country dropdown for a waypoint and returns iso code
   * the code is parsed from the option element id, e.g.:
   * id="waypoints[0].country-multiselect-option-AL" -> code: "AL"
   */
  async select_random_country(
    container_index: number,
  ): Promise<string> {
    this.log(`Opening country dropdown for waypoint ${container_index}`);
    const input = this.page.locator(`//input[@id="waypoints[${container_index}].country"]`).first();
    await input.waitFor({ state: 'visible', timeout: 15000 });
    await input.scrollIntoViewIfNeeded();
    await input.click({ timeout: 10000 });

    const options = this.page.locator(
      `//li[contains(@class,'multiselect-option') and starts-with(@id, "waypoints[${container_index}].country-multiselect-option-")]`
    );
    await options.first().waitFor({ state: 'visible', timeout: 10000 });
    const total = await options.count();
    if (total === 0) {
      throw new Error(`[waypoints] No country options available for waypoint ${container_index}`);
    }

    // consider only visible options for reliable clicking
    const visible_indices: number[] = [];
    for (let i = 0; i < total; i++) {
      if (await options.nth(i).isVisible()) {
        visible_indices.push(i);
      }
    }
    if (visible_indices.length === 0) {
      throw new Error(`[waypoints] No VISIBLE country options for waypoint ${container_index}`);
    }

    const pick = visible_indices[Math.floor(Math.random() * visible_indices.length)];
    const option = options.nth(pick);
    const id_attr = (await option.getAttribute('id')) || '';
    const raw_label = ((await option.getAttribute('aria-label')) || (await option.innerText()) || '').trim();
    const label = raw_label.split('\n').map(s => s.trim()).filter(Boolean)[0] || raw_label;

    // parse code from id: last segment after '-' 
    let code = '';
    const match = id_attr.match(/multiselect-option-([A-Za-z0-9_-]+)$/);
    if (match && match[1]) {
      code = match[1].toUpperCase();
    }

    this.log(`Selecting country option #${pick}: ${label} (${code || 'N/A'})`);
    await option.click({ timeout: 10000 });

    // try closing the dropdown for good measure
    try { await this.page.keyboard.press('Escape'); } catch {}

    if (!code) {
      throw new Error(`[waypoints] Could not parse country code from option id: ${id_attr}`);
    }

    return code;
  }

  /**
   * alias per requirement: add_waipoint_copntainer
   */
  async add_waipoint_copntainer(): Promise<void> {
    this.log('Adding waypoint container (alias)');
    // memorize the current containers count before clicking
    const containers = this.page.locator(`.draggable`);
    const before = await containers.count();

    // button "+ add waypoint" – locate robustly using role/name
    const addButton = this.page.getByRole('button', { name: 'Add waypoint' });
    await addButton.waitFor({ state: 'visible', timeout: 10000 });
    await addButton.scrollIntoViewIfNeeded();
    try { await this.page.waitForLoadState('networkidle'); } catch {}
    await Promise.all([
      this.page.waitForLoadState('networkidle'),
      addButton.click(),
    ]);

    // after clicking we expect the containers count to increase by 1
    await expect(containers, '[waypoints] container count after add').toHaveCount(before + 1, { timeout: 10000 });
  }

  /**
   * alias per requirement: remove_waipoint_container
   */
  async remove_waipoint_container(index: number): Promise<void> {
    this.log(`Removing waypoint container (alias) at index ${index}`);
    const containers = this.page.locator(`.draggable`);
    const total = await containers.count();
    if (index < 0 || index >= total) {
      throw new Error(`[waypoints] remove_waipoint_container: index ${index} out of bounds (total=${total})`);
    }

    const before = total;
    const container = containers.nth(index);
    const remove_btn = container.getByRole('button', { name: 'Remove' });
    await remove_btn.waitFor({ state: 'visible', timeout: 10000 });
    await remove_btn.scrollIntoViewIfNeeded();
    await remove_btn.click();

    // we expect the containers count to decrease by 1
    await expect(containers, '[waypoints] container count after remove').toHaveCount(before - 1, { timeout: 10000 });
  }

  /**
   * adjusts the number of waypoint containers to desired_count
   * counting uses elements with class 'draggable'
   * - if fewer present, calls add_waipoint_copntainer()
   * - if more present, calls remove_waipoint_container()
   */
  async ensure_container_count(desired_count: number): Promise<void> {
    this.log(`Ensuring waypoint container count = ${desired_count}`);
    const locator = this.page.locator(`.draggable`);
    const current = await locator.count();

    if (current < desired_count) {
      for (let i = current; i < desired_count; i++) {
        await this.add_waipoint_copntainer();
      }
    } else if (current > desired_count) {
      for (let i = current; i > desired_count; i--) {
        await this.remove_waipoint_container(i - 1);
      }
    }

    // final verification of containers count
    await this.verify_container_count(desired_count);
  }

  /**
   * returns the current number of waypoint containers
   */
  async get_container_count(): Promise<number> {
    const locator = this.page.locator(`.draggable`);
    return locator.count();
  }

  /**
   * verifies that the number of visible waypoint containers equals the expected value
   */
  async verify_container_count(expected_count: number): Promise<void> {
    this.log(`Verifying container count equals ${expected_count}`);
    const containers = this.page.locator(`.draggable`);
    await expect(containers).toHaveCount(expected_count);
  }
  /**
   * fills input by field key (name/street/city/country/zip)
   */
  async fill_input(container_index: number, field: WaypointFieldKey, value: string): Promise<void> {
    this.log(`Filling '${field}' with '${value}' for waypoint ${container_index}`);
    const input = this.page.locator(`//input[@id="waypoints[${container_index}].${field}"]`);
    await input.fill(value);
    await input.press('Enter');
  }

  /**
   * completes filling a single waypoint container according to provided data
   */
  async fill_container(
    container_index: number,
    data: WaypointContainerData,
  ): Promise<{ point_type?: PointType; availabilityStart?: string; availabilityEnd?: string; inputs?: WaypointContainerInputs; country_code?: string }> {
    this.log(`Filling container ${container_index} with provided data`);
    const resolved: { point_type?: PointType; availabilityStart?: string; availabilityEnd?: string; inputs?: WaypointContainerInputs; country_code?: string } = {};
    if (data.point_type) {
      await this.select_trip_type(container_index, data.point_type);
      resolved.point_type = data.point_type;
    }
    if (typeof data.availabilityStartOffset === 'number') {
      resolved.availabilityStart = await this.set_calendar_date(
        container_index,
        data.availabilityStartOffset,
        'availabilityStart',
      );
    }
    if (typeof data.availabilityEndOffset === 'number') {
      resolved.availabilityEnd = await this.set_calendar_date(
        container_index,
        data.availabilityEndOffset,
        'availabilityEnd',
      );
    }
    if (data.inputs) {
      for (const [field, value] of Object.entries(data.inputs) as [WaypointFieldKey, string][]) {
        if (value != null) {
          await this.fill_input(container_index, field, value);
        }
      }
      resolved.inputs = { ...data.inputs };
    }

    // dropdowns
    if (data.dropdowns?.country) {
      const country = data.dropdowns.country;
      const code = await this.select_random_country(container_index);
      resolved.country_code = code;
    }
    return resolved;
  }

}