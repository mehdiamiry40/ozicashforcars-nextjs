import { test, expect } from '@playwright/test';

async function fillQuote(page, vehicle = '2012 Toyota Corolla') {
  await expect(page.locator('#quote-name')).toBeEnabled();
  await page.locator('#quote-name').fill('Synthetic Browser Test');
  await page.locator('#quote-phone').fill('0400000000');
  await page.locator('#quote-suburb').fill('Brisbane');
  await page.locator('#quote-vehicle').fill(vehicle);
  await page.locator('#quote-expected-price').fill('3500');
  await page.locator('#quote-consent').check();
}

for (const mode of ['disabled JavaScript', 'blocked scripts', 'failed identity initialization']) {
  test(`quote data cannot enter a URL with ${mode}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: mode !== 'disabled JavaScript' });
    try {
      if (mode === 'blocked scripts') await context.route('**/*', route =>
        route.request().resourceType() === 'script' ? route.abort() : route.continue());
      if (mode === 'failed identity initialization') await context.addInitScript(() => {
        Object.defineProperty(crypto, 'randomUUID', {value: () => { throw new Error('Unavailable'); }});
      });
      const page = await context.newPage();
      const submissions = [];
      page.on('request', request => {
        if (request.method() === 'POST' || new URL(request.url()).searchParams.has('name')) submissions.push(request.url());
      });
      await page.goto(baseURL);
      await expect(page.locator('#quote-availability')).toBeVisible();
      await expect(page.locator('#quote-availability a')).toHaveAttribute('href', 'tel:0421719431');
      await expect(page.locator('form')).toHaveAttribute('method', 'post');
      await expect(page.locator('form')).toHaveAttribute('action', '/api/quote/');
      for (const input of await page.locator('form input, form textarea, form button').all()) await expect(input).toBeDisabled();
      await page.locator('form').click({position:{x:5,y:5}});
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(baseURL + '/');
      expect(submissions).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

test('a hydrated browser completes the local JSON quote flow', async ({ page }) => {
  await page.goto('/');
  await fillQuote(page);
  await expect(page.locator('#quote-availability')).toHaveCount(0);
  await page.waitForTimeout(1600); // Exercise the real minimum-entry-time guard.
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/quote/') && response.request().method() === 'POST');
  await page.getByRole('button', {name:'Get my free quote',exact:true}).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect((await response.json()).ok).toBe(true);
  await expect(page).toHaveURL(/\/thank-you\/$/);
});

test('a retry preserves its identity after an ambiguous failure', async ({ page }) => {
  const payloads = [];
  await page.route('**/api/quote/', async route => {
    payloads.push(route.request().postDataJSON());
    await route.fulfill({status:payloads.length === 1 ? 503 : 200, contentType:'application/json', body:JSON.stringify({ok:payloads.length > 1,message:'Please try again or call 0421 719 431.'})});
  });
  await page.goto('/');
  await fillQuote(page);
  await page.getByRole('button',{name:'Get my free quote',exact:true}).click();
  await expect(page.locator('.form-status')).toContainText('0421 719 431');
  await expect(page.getByRole('button',{name:'Get my free quote',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Get my free quote',exact:true}).click();
  await expect(page).toHaveURL(/\/thank-you\/$/);
  expect(payloads).toHaveLength(2);
  expect(payloads[1].submissionId).toEqual(payloads[0].submissionId);
  expect(payloads[0].submissionId).toMatch(/^[0-9a-f-]{36}$/i);
  expect(payloads[0].expectedPrice).toBe('3500');
});

test('a provider failure stays on the form with a useful phone alternative', async ({ page }) => {
  await page.goto('/');
  await fillQuote(page,'[provider-error] Test Vehicle');
  await page.waitForTimeout(1600);
  await page.getByRole('button',{name:'Get my free quote',exact:true}).click();
  await expect(page.locator('.form-status')).toContainText('0421 719 431');
  // Submitting disables the fieldset, so focus must be returned to the reason.
  await expect(page.locator('.form-status')).toBeFocused();
  await expect(page.getByRole('button',{name:'Get my free quote',exact:true})).toBeEnabled();
  expect(new URL(page.url()).search).toBe('');
});

test('the expected-price field blocks exactly what the endpoint rejects', async ({ page }) => {
  await page.goto('/');
  const price = page.locator('#quote-expected-price');
  await expect(price).toBeEnabled();
  for (const [value, accepted] of [
    ['3500', true], ['$3,500.50', true], ['3 500', true], ['1,234,567', true], ['1234567', true],
    ['12345678', false], ['12,345,678', false], ['3500.555', false], ['best offer', false],
  ]) {
    await price.fill(value);
    expect(await price.evaluate(input => input.checkValidity()), value).toBe(accepted);
  }
});
