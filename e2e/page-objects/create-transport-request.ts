import { Page } from '@playwright/test';
import { CargoInfoStep } from './create-transport/cargoinfo.step';
import { CarriersStep } from './create-transport/carriers.step';
import { WaypointsStep } from './create-transport/waypoints.step';
import { ReviewStep } from './create-transport/review.step';
import { ValidateStep } from './create-transport/validate.step';

/**
 * main page object for creating a transport request
 * orchestrates individual steps and provides a unified api
 */
export class CreateTransportRequest {
  readonly page: Page;
  
  // individual step objects
  readonly cargo_info: CargoInfoStep;
  readonly carriers: CarriersStep;
  readonly waypoints: WaypointsStep;
  readonly review: ReviewStep;
  readonly validate: ValidateStep;

  constructor(page: Page) {
    this.page = page;
    
    // initialize step objects
    this.cargo_info = new CargoInfoStep(page);
    this.carriers = new CarriersStep(page);
    this.waypoints = new WaypointsStep(page);
    this.review = new ReviewStep(page);
    this.validate = new ValidateStep(page);
  }

  /**
   * navigates to the create request page
   */
  async navigate_to_create_request(): Promise<void> {
    console.log('Navigating to create transport request page');
    await this.page.goto('/request/create');
  }

  /**
   * verifies we are on the correct page url
   */
  async verify_page_url(): Promise<void> {
    console.log('Verifying create transport request page URL');
    await this.page.waitForURL(/\/request\/create$/);
  }
}
