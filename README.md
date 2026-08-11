# POSProcesos

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.0.1.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Testing

```bash
npm run test              # Angular unit suite (Karma/ChromeHeadless)
npm run test:integration  # Angular view tests against the real backend (127.0.0.205/PointOfSale)
npm run test:e2e          # Playwright E2E against the local backend (127.0.0.205)
npm run test:e2e:headless # Playwright E2E — CI-friendly (headless)
npm run testthishit <host> # Playwright E2E with local code against any backend
```

- `npm run test` runs the mock-based unit tests (no backend required).
- `npm run test:integration` and `npm run test:e2e` talk to the real backend and create
  unique test records, so the backend at `http://127.0.0.205/PointOfSale` must be running.
- The E2E suite auto-starts (or reuses) the dev server on `http://127.0.0.205:4001` and
  uses the system Google Chrome (`channel: 'chrome'`), so no browser download is needed.
- `npm run testthishit <host>` runs this project's local code (dev server on
  `http://127.0.0.205:4001`) against the given backend host:
  - `npm run testthishit 127.0.0.195` → backend `http://127.0.0.195/PointOfSale`
  - `npm run testthishit 127.0.0.205` → backend `http://127.0.0.205/PointOfSale`
  - `npm run testthishit test.integranet.xyz` → backend `https://test.integranet.xyz/api`
  - Extra args pass through to Playwright (e.g. `-- --grep login`).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
