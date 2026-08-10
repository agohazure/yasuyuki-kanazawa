# Yasuyuki Kanazawa

Photography portfolio built with Astro and prepared for Cloudflare Pages.

## Pages

- `/works/portrait/`
- `/works/commercial/`
- `/works/landscape/`
- `/works/documentary/`
- `/about/`
- `/contact/`

## Photo manager

The private `/admin/` page uploads optimized photographs to Cloudflare R2. A photograph can have one or more of these tags:

- Portrait
- Commercial
- Landscape
- Documentary

The public galleries read the saved tags and per-category order immediately. The first published photograph in each category is also used in the four-image homepage gallery.

Cloudflare Pages requires these production bindings:

- R2 binding: `MEDIA_BUCKET`
- Secret: `ADMIN_PASSWORD`
- Secret: `SESSION_SECRET`

Until managed photographs are uploaded, the site keeps the existing neutral archive placeholders.

## Development

```sh
pnpm install
pnpm dev
pnpm build
```

Cloudflare Pages build settings:

- Build command: `pnpm build`
- Build output directory: `dist`
- Production branch: `main`
