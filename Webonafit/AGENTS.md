# Webonafit — agent notes

Public marketing site for BonaFIT (personal training in the Bonalba / Mutxamel area). No auth and no Desk `bona-*` kit.

It may call **only** `GET /branding` (and load `/uploads` image URLs) from BonafitApi to apply studio name, slogan, logo, and color seeds. Do not add other API resources, login, or the client portal here.

Dev server: `npm start` → `http://localhost:4200`; in dev the CLI renders the page through the SSR entry and hydrates it in the browser. Tests: `npm test`. Use `--port 4201` if BonafitDesk is already on 4200. `environment.apiUrl` is `http://localhost:8080` in development.

## SSR

Angular 19 integrated SSR is enabled in `angular.json`: `server` → `src/main.server.ts`, `ssr.entry` → `src/server.ts` (Express + `CommonEngine`), and `prerender: true`. The build prerenders `/` and `/contacto` into `dist/bonafit/browser/{index.html,contacto/index.html}` and also emits the Node server bundle in `dist/bonafit/server/`.

Production hosting is static: BonafitDeploy rsyncs `dist/*/browser`, so the prerendered HTML is what ships and no Node process runs. `npm run serve:ssr:bonafit` boots the server bundle locally (default port 4000) when checking runtime SSR.

Hydration is on (`provideClientHydration(withEventReplay())` in `app.config.ts`). Consequences:

- The server always renders `DEFAULT_LANGUAGE` (`es`); `LanguageService.restoreStoredLanguage()` applies a stored `en` preference only after hydration, otherwise Angular would hydrate against different text.
- `HomeComponent` scrolls to `#contacto` on the router's `Scroll` event (deferred one macrotask, instant on arrival); the router resets to the top in the same dispatch, including on hydration.
- Use the injected `DOCUMENT` (or `isPlatformBrowser`) for DOM and `localStorage` access. Direct `document`/`window`/`localStorage` reads at service construction break prerendering.
- `HttpClient` uses `withFetch()`, and the `/branding` initializer has a short timeout, so an unavailable API cannot hang a build or an SSR request.

## Layout

```
src/app/pages/home       # landing; /contacto is the same page, scrolls to #contacto
src/app/pages/contact    # form section embedded on home
src/app/components/      # button, text-field, modal, logo
src/app/navigation/      # contact-navigation.service: shared "go to #contacto"
src/app/studio-contact.ts # phone / WhatsApp / email constants
src/app/branding/        # GET /branding → CSS variables, title, favicon
src/main.server.ts       # Angular server bootstrap
src/server.ts            # Express SSR entry (local runtime; not deployed)
src/styles.scss          # brand tokens (manual palette + Jost / Lato)
public/brand/light|dark/ # logo.svg + mark.svg (cream dark/; optional *-pure.svg)
```

Routes in `app.routes.ts`: `''` and `'contacto'` both render `HomeComponent`. `HomeComponent` scrolls to `#contacto` after render when the URL is `/contacto`.

## Conventions

- Standalone Angular 19, `OnPush`, `input()` / `output()`, `signal` for form state.
- Selectors: `app-button`, `app-text-field`, `app-modal`, `app-logo`.
- Visual language is the marketing brand in `src/styles.scss`: `--color-forest` (#264233), `--color-cream` (#F3F0EB), Jost + Lato. Do not use Desk `--bona-*` tokens or Material.
- Brand spelling: **BonaFIT**. Commercial mark = `/brand/light/logo.svg` (paths; never typed wordmark). Header chrome uses `/brand/light/mark.svg` only. Dark backgrounds: `/brand/dark/{logo,mark}.svg` (cream `#F3F0EB`); optional `*-pure.svg` (`#FFFFFF`) — prefer real fills over CSS invert.
- Copy lives in `src/assets/i18n/` (es + en). Tone: calm, local, longevity/strength — not a SaaS dashboard. Public claims never lead with client age.
- Contact `sendMessage()` only validates and shows a success modal. It does **not** POST anywhere. Wire a backend only if asked; BonafitApi is not this site’s backend yet.

## Tests

Colocate `*.spec.ts`. Components are shallow-tested with TestBed. Preserve the `/contacto` scroll behavior if you touch `HomeComponent`.

## Do not

- Add Angular Material or BonafitDesk kit components.
- Point this app at `localhost:8080` only for `GET /branding` and branding asset URLs.
- Turn it into the client portal; that is BonafitDesk `/app`.
- Touch `document`, `window`, or `localStorage` outside a platform guard; it fails prerendering.
- Change the static output contract (`dist/*/browser`) without updating BonafitDeploy.
