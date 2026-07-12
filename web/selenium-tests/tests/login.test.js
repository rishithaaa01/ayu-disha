const { Builder, By, until } = require('selenium-webdriver');
const assert = require('assert');

// Base URL — update to your GitHub Pages URL after deployment
const BASE_URL = process.env.TEST_URL || 'http://localhost:5173';

// Test credentials — set via environment variables for CI safety
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@ayudisha.org';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test1234';

describe('AyuDisha Login E2E', function () {
  this.timeout(60000);

  let driver;

  before(async function () {
    driver = await new Builder().forBrowser('chrome').build();
  });

  after(async function () {
    await driver.quit();
  });

  it('should load the login page', async function () {
    await driver.get(`${BASE_URL}/#/login`);
    const title = await driver.getTitle();
    assert.ok(title.length > 0, 'Page title should not be empty');
  });

  it('should show the login form', async function () {
    await driver.get(`${BASE_URL}/#/login`);
    await driver.wait(until.elementLocated(By.id('email')), 10000);
    await driver.wait(until.elementLocated(By.id('password')), 10000);
    await driver.wait(until.elementLocated(By.id('login-button')), 10000);

    const emailInput = await driver.findElement(By.id('email'));
    const passwordInput = await driver.findElement(By.id('password'));
    const loginBtn = await driver.findElement(By.id('login-button'));

    assert.ok(await emailInput.isDisplayed(), 'Email input should be visible');
    assert.ok(await passwordInput.isDisplayed(), 'Password input should be visible');
    assert.ok(await loginBtn.isDisplayed(), 'Login button should be visible');
  });

  it('should show error on invalid credentials', async function () {
    await driver.get(`${BASE_URL}/#/login`);
    await driver.wait(until.elementLocated(By.id('email')), 10000);

    await driver.findElement(By.id('email')).sendKeys('wrong@example.com');
    await driver.findElement(By.id('password')).sendKeys('wrongpassword');
    await driver.findElement(By.id('login-button')).click();

    // Wait for error message to appear
    await driver.wait(
      until.elementLocated(By.xpath('//*[contains(text(), "Invalid") or contains(text(), "invalid")]')),
      10000
    );
    console.log('✅ Error message displayed for invalid credentials');
  });

  it('should redirect to dashboard on valid login', async function () {
    await driver.get(`${BASE_URL}/#/login`);
    await driver.wait(until.elementLocated(By.id('email')), 10000);

    await driver.findElement(By.id('email')).clear();
    await driver.findElement(By.id('email')).sendKeys(TEST_EMAIL);
    await driver.findElement(By.id('password')).clear();
    await driver.findElement(By.id('password')).sendKeys(TEST_PASSWORD);
    await driver.findElement(By.id('login-button')).click();

    // After successful login, URL should no longer be /login
    await driver.wait(async () => {
      const url = await driver.getCurrentUrl();
      return !url.includes('/login');
    }, 15000);

    const currentUrl = await driver.getCurrentUrl();
    assert.ok(!currentUrl.includes('/login'), `Should redirect away from login, got: ${currentUrl}`);
    console.log(`✅ Redirected to: ${currentUrl}`);
  });

  it('should redirect back to login on direct protected route access when logged out', async function () {
    // Open a protected route directly without being logged in
    await driver.get(`${BASE_URL}/#/patient`);
    await driver.sleep(2000);

    const currentUrl = await driver.getCurrentUrl();
    assert.ok(
      currentUrl.includes('/login') || currentUrl.includes('/#/login'),
      `Should redirect to login for protected route, got: ${currentUrl}`
    );
    console.log('✅ Protected route correctly redirected to login');
  });
});
