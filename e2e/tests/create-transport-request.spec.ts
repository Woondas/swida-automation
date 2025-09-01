import { faker } from '@faker-js/faker';
import { test, expect } from '@playwright/test';
import { CreateTransportRequest } from '../page-objects';
import { fill_by_id, assert_required_fields_have_errors } from '../utils/common';

let created_auction_ids: number[] = [];

test.describe('[Positive-test]', () => {
  let create_request: CreateTransportRequest;

  test.beforeEach(async ({ page }) => {
    create_request = new CreateTransportRequest(page);
    await create_request.navigate_to_create_request();
  });

  test.afterEach(async ({ request, baseURL }) => {
    if (!created_auction_ids.length) {
      console.log('[cleanup] No auctions to delete');
      return;
    }

    const base = (baseURL || '').replace(/\/+$/, '');
    for (const id of created_auction_ids) {
      const url = `${base}/api/v1/auctions/${id}/?includeMerged=false`;
      const response = await request.delete(url);
      console.log(`[cleanup] DELETE ${url} -> ${response.status()}`);
      expect(response.status()).toBe(204);
    }
    created_auction_ids = [];
  });

  test('Create transport request', async ({ page }) => {
    const create_request = new CreateTransportRequest(page);

    // navigation via page object (uses baseurl from config)
    await create_request.navigate_to_create_request();
    await create_request.waypoints.verify_on_waypoints_step();
    await create_request.waypoints.ensure_container_count(2);
    await create_request.waypoints.select_route_type('ONE_WAY');
    await create_request.waypoints.select_transport_mode('road');

    // helper to build waypoint container with shared structure
    function build_container(point_type: 'Pickup' | 'Delivery', offset: number) {
      const faker_name = `${faker.company.name()} s.r.o.`;
      const street_val = `${faker.location.street()} ${faker.number.int({ min: 1, max: 200 })}`;
      const city_val = faker.location.city();
      const post_code_val = faker.location.zipCode('#####');
      const contact_name_val = faker.person.fullName();
      const contact_email_val = faker.internet.email().toLowerCase();
      const contact_phone_val = `+421911${faker.number.int({ min: 100000, max: 999999 })}`;
      const reference_val = `+${point_type} ${faker.string.alphanumeric(6).toUpperCase()}`;

      const base = {
        point_type,
        dropdowns: { country: 'RANDOM' },
        inputs: {
          name: faker_name,
          street: street_val,
          city: city_val,
          postCode: post_code_val,
          contactName: contact_name_val,
          contactEmail: contact_email_val,
          contactPhone: contact_phone_val,
          reference: reference_val,
        },
      };

      return point_type === 'Pickup'
        ? { ...base, availabilityStartOffset: offset }
        : { ...base, availabilityEndOffset: offset };
    }

    const pick_up_container = build_container('Pickup', 1);

    // store resolved values for later validation
    const pickup_filled = await create_request.waypoints.fill_container(0, pick_up_container);

    const delivery_container = build_container('Delivery', 2);

    const delivery_filled = await create_request.waypoints.fill_container(1, delivery_container);

    await page.getByRole('button', { name: 'Continue' }).click();
    await create_request.cargo_info.verify_on_cargo_info_step();

    const cargo_data = {
      inputs: {
        'cargo.value': String(faker.number.int({ min: 1, max: 100 })),
        'cargo.maxLength': String(faker.number.int({ min: 1, max: 100 })),
        'cargo.weight': String(faker.number.int({ min: 1, max: 100 })),
        description: faker.lorem.sentence(),

      },
      dropdowns: {
        'cargo.specialRequirements': 'RANDOM',
        'cargo.type': 'RANDOM',
        'cargo.loadType': 'RANDOM',
        'cargo.maxLengthUnit': 'RANDOM',
        'cargo.weightUnit': 'RANDOM',
      },
    };
    const cargo_filled = await create_request.cargo_info.fill_cargo(cargo_data);
    console.log('cargo_filled', cargo_filled);
    const review_data = {
      inputs: {
        reference: `REF-${faker.string.alphanumeric(6).toUpperCase()}`,
        costCenter: `CC-${faker.number.int({ min: 1000, max: 9999 })}`,
      },
    };

    const review_filled = await create_request.review.fill_review(review_data);

    await page.getByRole('button', { name: 'Continue' }).click();
    await create_request.carriers.verify_on_carriers_step();
    await create_request.carriers.check_carrier_by_id(6401);

    await page.getByRole('button', { name: 'Continue' }).click();
    await create_request.review.verify_on_review_step();

    // validation of entered data
    console.log('Starting validation of entered data...');

    await create_request.validate.waypoint(0, pickup_filled);
    await create_request.validate.waypoint(1, delivery_filled);
    await create_request.validate.validate_block("//*[@id='cargo-info']", cargo_filled, 'cargo');
    await create_request.validate.validate_block("//*[@id='form-review']", review_filled, 'review');

    const auction_id = await create_request.validate.click_and_wait_for_transport_request('Send request');
    console.log('Auctions:', auction_id);
    created_auction_ids = Array.isArray(auction_id) ? auction_id : [auction_id];

    await create_request.validate.validate_block("//*[@id='form-review']", review_filled, 'review');

    await create_request.validate.click_and_verify_active_state("//*[@id='tab-request-route']");
    await create_request.validate.waypoint(0, pickup_filled);
    await create_request.validate.waypoint(1, delivery_filled);

    await create_request.validate.click_and_verify_active_state("//*[@id='tab-request-cargo']");
    await create_request.validate.validate_block("//*[@id='cargo-info']", cargo_filled, 'cargo');

    console.log('✅ All validations passed successfully!');
  });
});

test.describe('[Negative-tests]', () => {
  let create_request: CreateTransportRequest;

  test.beforeEach(async ({ page }) => {
    create_request = new CreateTransportRequest(page);
    // navigate to the same url as in the positive scenario
    await create_request.navigate_to_create_request();
    await create_request.waypoints.verify_on_waypoints_step();
  });
  test('[Review] verify if button is disabled because of empty carriers', async ({ page }) => {
    // navigation via page object (uses baseurl from config)
    await create_request.navigate_to_create_request();
    await create_request.waypoints.verify_on_waypoints_step();
    await create_request.waypoints.ensure_container_count(2);
    await create_request.waypoints.select_route_type('ONE_WAY');
    await create_request.waypoints.select_transport_mode('road');

    // helper to build waypoint container with shared structure
    function build_container(point_type: 'Pickup' | 'Delivery', offset: number) {
      const city_val = faker.location.city();

      const base = {
        point_type,
        dropdowns: { country: 'RANDOM' },
        inputs: {
          city: city_val,
        },
      };

      return point_type === 'Pickup'
        ? { ...base, availabilityStartOffset: offset }
        : { ...base, availabilityEndOffset: offset };
    }

    const pick_up_container = build_container('Pickup', 1);
    await create_request.waypoints.fill_container(0, pick_up_container);
    const delivery_container = build_container('Delivery', 2);
    await create_request.waypoints.fill_container(1, delivery_container);

    await create_request.validate.click_and_verify_active_state("//*[@id='button-step-Cargo info']");
    await create_request.validate.click_and_verify_active_state("//*[@id='button-step-Carriers']");
    await create_request.validate.click_and_verify_active_state("//*[@id='button-step-Review']");
    await create_request.validate.verify_button_disabled_by_name('Send request');


  });

  test('[Waypoints] required fields show error', async ({ page }) => {

    await page.getByRole('button', { name: 'Continue' }).click();

    await assert_required_fields_have_errors(page);
  });

  test('[Waypoints] invalid email format shows error', async ({ page }) => {

    // find all email inputs in waypoints
    const email_inputs = page.locator("//input[starts-with(@id,'waypoints[') and contains(@id,'.contactEmail')]");
    const email_count = await email_inputs.count();
    expect(email_count).toBeGreaterThan(0);

    const invalid_emails = [
      'plainaddress',
      'missing-at.domain.com',
      'name@domain',
      '@nouser.com',
      'name@.com',
      'name@domain..com',
      'name@domain.c',
      'name@@domain.com',
      'name domain@domain.com',
    ];

    for (const invalid_email of invalid_emails) {
      for (let i = 0; i < email_count; i++) {
        const id_attr = await email_inputs.nth(i).getAttribute('id');
        if (!id_attr) continue;
        await fill_by_id(page, id_attr, invalid_email, 'bad-email');
      }

      await create_request.validate.click_continue_and_expect_bad_eamil('Enter a valid email address.');

      for (let i = 0; i < email_count; i++) {
        const id_attr = await email_inputs.nth(i).getAttribute('id');
        if (!id_attr) continue;
        const error_locator = page.locator(
          `//label[@*="${id_attr}"]/following-sibling::div//span[contains(@class,'error-message') and normalize-space(.)='Enter a valid email address.']`
        );
        await expect(error_locator).toBeVisible();
      }
    }
  });

});

// component test
test.describe('[Component]', () => {
  let create_request: CreateTransportRequest;

  test.beforeEach(async ({ page }) => {
    create_request = new CreateTransportRequest(page);
    await create_request.navigate_to_create_request();
    await create_request.waypoints.verify_on_waypoints_step();
  });

  test('[Waypoints] Add/remove waypoint containers', async ({ page }) => {
    console.log('[waypoints-test] starting add/remove flow');

   await create_request.waypoints.ensure_container_count(0);
   await create_request.waypoints.select_route_type('ONE_WAY');
   await create_request.waypoints.add_waipoint_copntainer();
   await create_request.waypoints.verify_container_count(1);
   await create_request.waypoints.ensure_container_count(0);

   await create_request.waypoints.ensure_container_count(0);
   await create_request.waypoints.select_route_type('ROUND_TRIP');
   await create_request.waypoints.add_waipoint_copntainer();
   await create_request.waypoints.verify_container_count(1);

  });
});
