## E2E tests – setup and run
### Requirements
- Node.js 18+ and npm

### Install dependencies
1. Install existing dependencies:
```bash
npm install
```
2. Install Playwright and dotenv (if not already installed):
```bash
npm i -D @playwright/test dotenv
npx playwright install
```

### Deterministic installation (exactly as in package-lock.json)
If you want to install exactly the versions from `package-lock.json` deterministically, use:
```bash
npm ci
```

### Environment configuration (.env) – ./env/.env.stage
Create the file `.env.stage` under the `env/` directory and set the test URL in the `BASE_URL` variable:
```bash
BASE_URL=https://...
```
The Playwright configuration (`playwright.config.ts`) reads this value via `process.env.BASE_URL`.

Note: The configuration is currently set to `ENV='stage'`, so it always loads `./env/.env.stage`.

### Saving login state (auth.json)
Before running tests, you need to have a saved login state so the browser starts already logged in.

1. Start Playwright Codegen, log in with a test account, and close the window (this saves `auth.json`):
```bash
npx playwright codegen https://.../login --save-storage=e2e/.auth/auth.json
```

Note: `playwright.config.ts` uses `storageState: 'e2e/.auth/auth.json'`, so the path must match.

### Running tests
Run all tests:
```bash
npx playwright test
```

Useful examples:
- Run a specific test file:
```bash
npx playwright test e2e/tests/create-transport-request.spec.ts
```
- Run in headed mode:
```bash
npx playwright test --headed
```

### Reports (built-in)
- HTML report (classic):
```bash
npx playwright test --reporter=html
npx playwright show-report
```
This generates an interactive report in the `playwright-report/` folder.

- Combine console and HTML reporters:
```bash
npx playwright test --reporter=list,html
```

- Optional configuration in `playwright.config.ts`:
```ts
reporter: [
  ['list'],
  ['html', { open: 'never' }] // 'always' | 'never' | 'on-failure'
]
```
