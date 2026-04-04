# E2E Testing Guide

End-to-end tests for Chamba Admin Panel using Playwright.

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/tests/auth.spec.js

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests with specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Structure

```
e2e/
├── tests/
│   ├── auth.spec.js        # Authentication flows
│   └── navigation.spec.js   # Navigation and UI
└── README.md
```

## Test Files

### auth.spec.js
Tests for login and authentication flows:
- Login form display
- Email validation
- Password validation
- Form submission
- Loading states

### navigation.spec.js
Tests for navigation and UI:
- Page structure
- Navigation between pages
- Responsive layouts
- Accessibility (headings, contrast)

## Configuration

See `playwright.config.js` for:
- Browser engines (Chromium, Firefox, WebKit)
- Test timeout settings
- Screenshot on failure
- Trace recording
- Web server configuration

## Reports

After running tests, view detailed HTML report:

```bash
npx playwright show-report
```

## Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Wait for elements** using Playwright's built-in waiting
3. **Test user interactions** not implementation details
4. **Keep tests focused** on specific user flows
5. **Use page objects** for complex interactions
6. **Mock API calls** when needed for reliability

## Debugging

```bash
# Run single test in debug mode
npx playwright test e2e/tests/auth.spec.js --debug

# View trace after test failure
npx playwright show-trace trace.zip
```

## CI/CD Integration

Tests can be integrated into CI/CD pipeline:

```yaml
- name: Run E2E tests
  run: npm run test:e2e
```

## Future Enhancements

- [ ] Add page object models
- [ ] Add visual regression testing
- [ ] Add performance testing
- [ ] Add accessibility testing with axe
- [ ] Add custom fixture for auth state
- [ ] Add test data factories
