# BonafitDesk — agent notes

Angular 19 standalone app: trainer admin (`/admin`) and client portal (`/app`). Default UI language is Spanish.

Dev server: `npm start` → `http://localhost:4200`. Tests: `npm test` (Karma + Jasmine). Prefer `ng test --watch=false --browsers=ChromeHeadless` when a browser must not stay open.

## Layout

```
src/app/components/bona-*   # shared UI kit (use these in modules)
src/app/modules/            # routed screens (admin, portal, login)
src/app/services/           # *ApiService HTTP facades
src/app/core/               # API interfaces, booking, auth guards, interceptors, apiUrl
src/app/models/             # camelCase DTOs (JSON contract)
src/app/i18n/es.ts          # shared shell/login literals
src/environments/           # apiUrl origin
src/app/testing/            # HTTP/screen spec fixtures (not a mock API)
```

Routes: `src/app/app.routes.ts`. Lazy-load screens with `loadComponent`. Guards: `adminGuard`, `clientGuard`, `homeRedirectGuard`, `authenticatedGuard`. Password-change screen: `/cambiar-clave`.

## Data layer

Screens inject `*ApiService` only. Those services call BonafitApi through `HttpClient`. `environment.apiUrl` is the API **origin** (dev: `http://localhost:8080`); `apiUrl()` appends resource paths. Do not bake `/api` into the origin unless a proxy actually mounts there.

Auth: `POST /auth/login` with `{ email, password }`. Persist the JWT in `AuthTokenStore`. `authTokenInterceptor` sends `Authorization: Bearer`. `apiErrorInterceptor` maps `409 { code }` to `ApiBusinessError` and `404 { resource, id }` to `ApiNotFoundError`. `GET /auth/me` refreshes the user; the token field from `/me` is empty — keep the stored login token.

If `mustChangePassword` is true, guards send the user to `/cambiar-clave` (`POST /auth/change-password`).

For a new resource:

1. DTO in `models/`.
2. Interface in `core/<resource>-api.ts`.
3. `*-api.service.ts` using `apiUrl(API_PATHS…)`.
4. Screens inject the facade only.

HTTP helpers: `API_PATHS` + `apiUrl()` in `core/api-url.ts`, query params via `toHttpParams`.

## UI conventions

- Standalone components, `ChangeDetectionStrategy.OnPush`, `inject()`, `signal` / `computed` for local state.
- New public APIs on kit components: `input()` / `output()`. Older kit pieces (`bona-button`, `bona-grid`) still use `@Input` / `@Output` — do not mix both styles on the same component.
- Screens compose `bona-form`, `bona-field`, `bona-grid`, `bona-button`, `bona-shell-*`, `bona-calendar`. Do not drop raw Angular Material into a module unless extending the kit.
- Selector prefix: `app-` (kit: `app-bona-*`).
- Spanish copy: `*.literals.ts` next to the module, or `i18n/es.ts` for shared chrome. Templates bind `literals`, they do not hardcode user-facing strings.
- Styles: component SCSS + `--bona-*` tokens in `src/styles.scss`. Do not copy Webonafit’s forest/cream tokens.

## Tests

Colocate `*.spec.ts`. Patterns already in the repo:

- HTTP services: `configureHttpClientTesting()` from `core/http-testing.ts` (includes auth/error interceptors).
- Screens: `RouterTestingHarness`, spy the `*ApiService`, `provideNoopAnimations()`.
- Booking: unit tests in `core/booking.spec.ts`. Keep behavior aligned with `BonafitApi/app/booking.py`.
- Shared fixture objects live in `src/app/testing/fixtures.ts`.

## Do not

- Import Webonafit components or fonts.
- Call `HttpClient` from a routed module; go through the facade.
- Reintroduce an in-memory mock API or `useMockApi`.
