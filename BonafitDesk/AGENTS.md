# BonafitDesk — agent notes

Angular 19 standalone app: trainer admin (`/admin`) and client portal (`/app`). Default UI language is Spanish.

Dev server: `npm start` → `http://localhost:4200`. Tests: `npm test` (Karma + Jasmine). Prefer `ng test --watch=false --browsers=ChromeHeadless` when a browser must not stay open.

## Layout

```
src/app/components/bona-*   # shared UI kit (use these in modules)
src/app/modules/            # routed screens (admin, portal, login, settings)
src/app/services/           # *ApiService HTTP facades
src/app/core/               # API interfaces, booking, auth guards, interceptors, apiUrl
src/app/models/             # camelCase DTOs (JSON contract)
src/app/i18n/es.ts          # shared shell/login literals
src/environments/           # apiUrl origin
src/app/testing/            # HTTP/screen spec fixtures (not a mock API)
src/styles/_theme.scss      # Material 3 palettes + --bona-* token aliases
```

Routes: `src/app/app.routes.ts`. Lazy-load screens with `loadComponent`. Guards: `adminGuard`, `clientGuard`, `homeRedirectGuard`, `authenticatedGuard`. Forced password-change screen: `/cambiar-clave` (no app bar). Role homes: `/admin/calendar` and `/app/agenda`. Settings: `/admin/ajustes` and `/app/ajustes`.

Authenticated chrome is `bona-shell-app` (top bar, nav, profile menu). Admin wrapper: `modules/admin/admin-shell`. Client wrapper: `modules/portal/portal-shell`.

## Data layer

Screens inject `*ApiService` only. Those services call BonafitApi through `HttpClient`. `environment.apiUrl` is the API **origin** (dev: `http://localhost:8080`); `apiUrl()` appends resource paths. Do not bake `/api` into the origin unless a proxy actually mounts there.

Branding: `GET /branding` is public; `PUT /branding` and logo/favicon uploads are admin. `BrandThemeService` applies studio colors to `--bona-*` / `--mat-sys-*` at startup.

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
- Screens compose `bona-form`, `bona-field`, `bona-grid`, `bona-button`, `bona-shell-app`, `bona-page`, `bona-confirm`, `bona-toast`, `bona-tabs`, `bona-calendar`. Do not drop raw Angular Material into a module unless extending the kit.
- Selector prefix: `app-` (kit: `app-bona-*`).
- Spanish copy: `*.literals.ts` next to the module, or `i18n/es.ts` for shared chrome. Templates bind `literals`, they do not hardcode user-facing strings.
- Styles: component SCSS + `--bona-*` tokens. Retune Material palettes and token aliases in `src/styles/_theme.scss`. Do not restyle screens with one-off hex, and do not copy Webonafit’s forest/cream tokens.

## Responsive

One breakpoint pair, used app-wide: `@media (max-width: 48rem)` = phone, `@media (min-width: 48.01rem)` = desktop.
Do not add further breakpoints; tune the phone block of the component you are changing instead. Style with
`--bona-*` tokens only (no one-off hex).

- `src/index.html` carries `viewport-fit=cover`; the app bar and full-screen dialogs honour `env(safe-area-inset-*)`.
- `bona-shell-app` drops the top nav below 48rem and shows a fixed bottom bar (`--bona-bottom-nav-height`);
  screen content reserves that height plus the bottom inset.
- `bona-grid` renders a card list instead of the `mat-table` below 48rem — pass `titleColumn` / `metaColumns`
  so each card is readable on its own.
- Dialog overlays (`bona-dialog`, `.cdk-overlay-pane.bona-dialog`) go full-screen below 48rem and size with
  `100dvh` (plus a `100vh` fallback) so mobile browser chrome does not clip them.
- `bona-tabs` is one horizontally scrollable row on phones; `bona-board` columns snap while swiping.
- `bona-calendar` opens in day view on phones and sets `dayMinWidth` so a 7-day grid scrolls instead of
  squashing; the calendar and schedules toolbars stick under the app bar.
- Phone touch targets are at least 2.75rem high (`bona-button`, tab rows, grid cards) and text inputs render
  at 16px so Mobile Safari does not zoom on focus.

## Tests

Colocate `*.spec.ts`. Patterns already in the repo:

- HTTP services: `configureHttpClientTesting()` from `core/http-testing.ts` (includes auth/error interceptors).
- Screens: `RouterTestingHarness`, spy the `*ApiService`, `provideNoopAnimations()`. Screens that confirm or toast should use `provideBonaFeedbackTesting()` from `testing/bona-feedback.ts`.
- Booking: unit tests in `core/booking.spec.ts`. Keep behavior aligned with `BonafitApi/app/booking.py`.
- Shared fixture objects live in `src/app/testing/fixtures.ts`.

## Do not

- Import Webonafit components or fonts.
- Call `HttpClient` from a routed module; go through the facade.
- Reintroduce an in-memory mock API or `useMockApi`.
