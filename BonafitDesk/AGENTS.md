# BonafitDesk — agent notes

Angular 19 standalone app: trainer admin (`/admin`) and client portal (`/app`). Default UI language is Spanish.

Dev server: `npm start` → `http://localhost:4200`. Tests: `npm test` (Karma + Jasmine). Prefer `ng test --watch=false --browsers=ChromeHeadless` when a browser must not stay open.

## Layout

```
src/app/components/bona-*   # shared UI kit (use these in modules)
src/app/modules/            # routed screens (admin, portal, login)
src/app/services/           # *ApiService facades + *-mock + *-http
src/app/core/               # API interfaces, mocks, booking, auth guards, apiUrl
src/app/models/             # camelCase DTOs (JSON contract)
src/app/i18n/es.ts          # shared shell/login literals
src/environments/           # apiUrl + useMockApi
```

Routes: `src/app/app.routes.ts`. Lazy-load screens with `loadComponent`. Guards: `adminGuard`, `clientGuard`, `homeRedirectGuard`.

## Data layer

`environment.useMockApi` (dev: `true`, prod: `false`) picks mock vs HTTP inside each `*ApiService`.

For a new resource:

1. DTO in `models/`.
2. Interface in `core/<resource>-api.ts`.
3. `*-mock.service.ts` (uses `MockStore` / `mock-data.ts`) and `*-http.service.ts` (uses `apiUrl(API_PATHS…)`).
4. Facade `*-api.service.ts` that `inject()`s mock or HTTP from `environment.useMockApi`.
5. Screens inject the facade only, never mock/http classes.

HTTP helpers: `API_PATHS` + `apiUrl()` in `core/api-url.ts`, query params via `toHttpParams`. There is **no** auth interceptor yet; Bearer tokens are not attached automatically.

Login is an account picker (`login(userId)`). That matches mocks. The real API expects `{ email, password }` — keep both implementations behind `AuthApi` if you wire HTTP login; do not silently change the picker UX.

## UI conventions

- Standalone components, `ChangeDetectionStrategy.OnPush`, `inject()`, `signal` / `computed` for local state.
- New public APIs on kit components: `input()` / `output()`. Older kit pieces (`bona-button`, `bona-grid`) still use `@Input` / `@Output` — do not mix both styles on the same component.
- Screens compose `bona-form`, `bona-field`, `bona-grid`, `bona-button`, `bona-shell-*`, `bona-calendar`. Do not drop raw Angular Material into a module unless extending the kit.
- Selector prefix: `app-` (kit: `app-bona-*`).
- Spanish copy: `*.literals.ts` next to the module, or `i18n/es.ts` for shared chrome. Templates bind `literals`, they do not hardcode user-facing strings.
- Styles: component SCSS + `--bona-*` tokens in `src/styles.scss`. Do not copy Webonafit’s forest/cream tokens.

## Tests

Colocate `*.spec.ts`. Patterns already in the repo:

- Facades: toggle `environment.useMockApi` and use `HttpTestingController` for HTTP (`services/api-facade.service.spec.ts`).
- HTTP services: `configureHttpClientTesting()` from `core/http-testing.ts`.
- Screens: `RouterTestingHarness`, spy the `*ApiService`, `provideNoopAnimations()`.
- Booking: unit tests in `core/booking.spec.ts`. Keep behavior aligned with `BonafitApi/app/booking.py`.

## Do not

- Import Webonafit components or fonts.
- Call `HttpClient` from a routed module; go through the facade.
- Set `useMockApi: false` in committed `environment.ts` unless the HTTP auth + interceptor work is actually done.
