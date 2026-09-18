# Webonafit — agent notes

Public marketing site for Bonafit (personal training in the Bonalba / Mutxamel area). No auth and no Desk `bona-*` kit.

It may call **only** `GET /branding` (and load `/uploads` image URLs) from BonafitApi to apply studio name, slogan, logo, and color seeds. Do not add other API resources, login, or the client portal here.

Dev server: `npm start` → `http://localhost:4200`. Tests: `npm test`. Use `--port 4201` if BonafitDesk is already on 4200. `environment.apiUrl` is `http://localhost:8080` in development.

## Layout

```
src/app/pages/home       # landing; /contacto is the same page, scrolls to #contacto
src/app/pages/contact    # form section embedded on home
src/app/components/      # button, text-field, modal, logo
src/styles.scss          # brand tokens
public/brand/            # favicon / brand assets
```

Routes in `app.routes.ts`: `''` and `'contacto'` both render `HomeComponent`. `HomeComponent` scrolls to `#contacto` after render when the URL is `/contacto`.

## Conventions

- Standalone Angular 19, `OnPush`, `input()` / `output()`, `signal` for form state.
- Selectors: `app-button`, `app-text-field`, `app-modal`, `app-logo`.
- Visual language is the marketing brand in `src/styles.scss`: `--color-forest`, `--color-cream`, Cormorant Garamond + Outfit. Do not use Desk `--bona-*` tokens or Material.
- Copy lives in the components today (Spanish). Keep tone: calm, local, longevity/strength — not a SaaS dashboard.
- Contact `sendMessage()` only validates and shows a success modal. It does **not** POST anywhere. Wire a backend only if asked; BonafitApi is not this site’s backend yet.

## Tests

Colocate `*.spec.ts`. Components are shallow-tested with TestBed. Preserve the `/contacto` scroll behavior if you touch `HomeComponent`.

## Do not

- Add Angular Material or BonafitDesk kit components.
- Point this app at `localhost:8080` only for `GET /branding` and branding asset URLs.
- Turn it into the client portal; that is BonafitDesk `/app`.
