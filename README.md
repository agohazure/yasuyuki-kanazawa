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

The private `/admin/` page uploads optimized photographs to Cloudflare R2. Photographs are organized into series representing one project or theme. A series can have one or more of these tags:

- Portrait
- Commercial
- Landscape
- Documentary

The public galleries display each series as one block. Visitors move through its photographs with the left and right image edges. The manager can create series, add photographs to an existing series, move an uploaded photograph between series, edit tags, reorder photographs inside a series, and reorder series per category. The first published series in each category is also used in the four-image homepage gallery.

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
