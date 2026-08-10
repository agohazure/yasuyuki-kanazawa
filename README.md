# Yasuyuki Kanazawa

Photography portfolio built with Astro and prepared for Cloudflare Pages.

## Pages

- `/works/portrait/`
- `/works/commercial/`
- `/works/landscape/`
- `/works/documentary/`
- `/about/`
- `/contact/`

## Add photographs

1. Place optimized image files in `public/images/<category>/`.
2. Open `src/data/works.ts`.
3. Add an `image` path to the relevant work, for example:

```ts
{
  title: 'Portrait 01',
  alt: 'Description of the photograph',
  image: '/images/portrait/portrait-01.webp',
  aspect: 'portrait',
}
```

Until an image path is supplied, the site shows a neutral archive placeholder rather than unrelated stock photography.

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
