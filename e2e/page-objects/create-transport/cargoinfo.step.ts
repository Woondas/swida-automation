import { Page, expect } from '@playwright/test';
import { fill_by_id, select_random_from_dropdown } from '../../utils/common';

export type CargoInputKey = 'reference' | 'costCenter' | 'description';
export interface CargoInputs { [key: string]: string | undefined }
export type CargoDropdownKey = 'specialRequirements' | 'type' | 'loadType';
export interface CargoDropdowns { [key: string]: string | undefined }
export interface CargoData { inputs?: CargoInputs; dropdowns?: CargoDropdowns }
export interface CargoResolvedData { inputs?: CargoInputs; dropdowns?: Partial<Record<string,string>> }

/**
 * page object for the cargo information step
 */
export class CargoInfoStep {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // consistent logging helper for cargo info
  private log(message: string): void {
    console.log(`[cargo] ${message}`);
  }

  async verify_on_cargo_info_step(): Promise<void> {
    this.log('Verifying active step is cargo info');
    const tab = this.page.locator('//button[@id="button-step-Cargo info"]');
    await expect(tab).toBeVisible();
    await expect(tab).toHaveClass(/active/);
  }

  /**
   * parametrized filling of the cargo section, returning resolved values used
   */
  async fill_cargo(data: CargoData): Promise<CargoResolvedData> {
    this.log('Filling cargo form');

    const resolved: CargoResolvedData = {};

    const dropdown_id_map: Record<string, string> = {
      specialRequirements: 'cargo.specialRequirements',
      type: 'cargo.type',
      loadType: 'cargo.loadType',
    };

    const pick_random = async (field_id: string) => {
      const opener = `//*[@id='${field_id}']//*[contains(@class,'multiselect-wrapper')] | //*[@id='${field_id}']`;
      const options = `//*[@id='${field_id}-dropdown']//*[self::li or @role='option']`;
      return select_random_from_dropdown(this.page, opener, options, 'cargo');
    };

    const dropdown_results: Record<string, string> = {};
    for (const [key, choice] of Object.entries(data.dropdowns || {})) {
      if (!choice) continue;
      if (choice.toUpperCase() !== 'RANDOM') continue;
      const field_id = dropdown_id_map[key] ?? key; // fallback: key is the element id
      dropdown_results[key] = await pick_random(field_id);
    }
    if (Object.keys(dropdown_results).length) {
      resolved.dropdowns = dropdown_results;
    }

    const input_id_map: Record<string, string> = {
      reference: 'reference',
      costCenter: 'costCenter',
      description: 'cargo.description',
    };

    for (const [key, value] of Object.entries(data.inputs || {})) {
      if (!value) continue;
      const field_id = input_id_map[key] ?? key; // fallback: key is the element id
      await fill_by_id(this.page, field_id, String(value), 'cargo');
    }
    if (data.inputs) resolved.inputs = { ...data.inputs };

    return resolved;
  }
}
