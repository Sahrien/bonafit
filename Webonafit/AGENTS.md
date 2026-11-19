# Webonafit — agent notes

Public marketing site for BonaFIT (personal training in the Bonalba / Mutxamel area). No auth and no Desk `bona-*` kit.

It makes **no backend calls**. Studio identity is static: `src/app/site.ts` (name, slogan, origin), `src/styles.scss` (colors/typography), `src/app/studio-contact.ts` (phone, WhatsApp, email) and `src/assets/i18n/` (localized copy, address, hours). Do not add API resources, login, or the client portal here.

Dev server: `npm start` → `http://localhost:4200`; in dev the CLI renders the page through the SSR entry and hydrates it in the browser. Tests: `npm test`. Use `--port 4201` if BonafitDesk is already on 4200.

## URLs and language

Default language is Spanish at the root; English lives under `/en`.

| URL | Result |
| --- | --- |
| `/` | Spanish home (canonical, `x-default`) |
| `/en` | English home |
| `/es` | redirect to `/` |
| `/contacto`, `/es/contacto` | redirect to `/#contacto` (legacy aliases) |
| `/en/contacto` | redirect to `/en#contact` |
| anything else | `NotFoundComponent` (noindex) |

`LanguageService` reads the URL (never `localStorage`): `provideWebTranslate()` loads the bundle before bootstrap, so prerendered HTML and hydration are already in the right language. The language switcher navigates to the equivalent URL and preserves the localized contact fragment.

The contact section is an anchor on the home page, not its own page: `#contacto` in Spanish and `#contact` in English. Keep `CONTACT_FRAGMENT` in `site.ts` as the single source.

## SEO

`SeoService` (called on every router `NavigationEnd`) writes localized title/description, canonical and hreflang (`es`, `en`, `x-default`) and drops them on the 404 page. Production origin is `https://bona-fit.es` in `site.ts`; keep `public/sitemap.xml` and `public/robots.txt` in sync with it. The sitemap lists `/` and `/en` only.

## SSR

Angular 19 integrated SSR is enabled in `angular.json`: `server` → `src/main.server.ts`, `ssr.entry` → `src/server.ts` (Express + `CommonEngine`), and prerender driven by `prerender-routes.txt` (`discoverRoutes: false`). The build prerenders `/` and `/en` into `dist/bonafit/browser/{index.html,en/index.html}` and emits the Node server bundle in `dist/bonafit/server/`. Add new public routes to `prerender-routes.txt`.

Production hosting is static: BonafitDeploy rsyncs `dist/*/browser`, so the prerendered HTML ships and no Node process runs. `npm run serve:ssr:bonafit` boots the server bundle locally (port 4000) for runtime checks.

Hydration is on (`provideClientHydration(withEventReplay())`). Consequences:

- The language must come from the URL so server HTML and client hydration agree; do not restore a stored language after bootstrap.
- Use injected `DOCUMENT` / `isPlatformBrowser` for DOM access. Direct `document`/`window`/`localStorage` at construction breaks prerendering.
- Scrolls/anchors are handled by the router (`withInMemoryScrolling`); the 404 and redirect routes are client-side, so the static host needs SPA fallback and ideally `error_page 404 /404.html` (deploy concern).

## Layout

```
src/app/pages/home        # landing
src/app/pages/contact     # form section embedded on home
src/app/pages/not-found   # clean 404
src/app/components/       # button, text-field, modal, logo
src/app/i18n/             # bundled es/en copy + URL-driven language
src/app/seo/              # title, description, canonical, hreflang
src/app/navigation/       # contact-navigation.service
src/app/site.ts           # name, slogan, origin, language paths, contact fragments
src/app/studio-contact.ts # phone / WhatsApp / email constants
public/brand/light|dark/  # logo.svg + mark.svg (cream dark/; optional *-pure.svg)
public/sitemap.xml        # / and /en with hreflang alternates
public/robots.txt         # sitemap reference
src/main.server.ts        # Angular server bootstrap
src/server.ts             # Express SSR entry (local runtime; not deployed)
```

## Conventions

- Standalone Angular 19, `OnPush`, `input()` / `output()`, `signal` for form state.
- Selectors: `app-button`, `app-text-field`, `app-modal`, `app-logo`.
- Visual language is the marketing brand in `src/styles.scss`: `--color-forest` (#264233), `--color-cream` (#F3F0EB), Jost + Lato. Do not use Desk `--bona-*` tokens or Material.
- Brand spelling: **BonaFIT**. Commercial mark = `/brand/light/logo.svg` (paths; never typed wordmark). Header chrome uses `/brand/light/mark.svg` only. Dark backgrounds: `/brand/dark/{logo,mark}.svg` (cream `#F3F0EB`); optional `*-pure.svg` (`#FFFFFF`) — prefer real fills over CSS invert.
- Copy lives in `src/assets/i18n/` (es + en). Tone: calm, local, longevity/strength — not a SaaS dashboard. Public claims never lead with client age.
- Contact `sendMessage()` only validates and shows a success modal. It does **not** POST anywhere.

## Tests

Colocate `*.spec.ts`. Components are shallow-tested with TestBed; `provideWebTranslate()` is required by anything that injects `LanguageService`/translations or the router shell. Preserve language routing, contact fragments and 404/noindex behavior when touching routes or SEO.

## Do not

- Add Angular Material or BonafitDesk kit components.
- Re-introduce `GET /branding` or any BonafitApi dependency.
- Turn it into the client portal; that is BonafitDesk `/app`.
- Touch `document`, `window`, or `localStorage` outside a platform guard; it fails prerendering.
- Change the static output contract (`dist/*/browser`) without updating BonafitDeploy.
