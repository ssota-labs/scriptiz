# Scriptiz documentation (Mintlify)

- **Getting started:** [quickstart.mdx](./quickstart.mdx) leads with `**npx -y @scriptiz/mcp`** + Docker (all-in-one image), then Compose and “from source” options.
- **Locale:** English only (`docs.json` with a single navigation). To add Korean or other languages, use Mintlify [i18n](https://www.mintlify.com/docs/guides/internationalization) and mirror pages under `ko/` (or add `navigation.languages`).
- **Local preview:** from repo root, `pnpm dev:docs` (or `pnpm dev` in this directory).
- **Deploy:** see [deployment.mdx](./deployment.mdx) — set the monorepo path to `**apps/docs`** in the Mintlify dashboard.

The `mint` CLI is a dev dependency in `package.json`. After `pnpm install`, you can also run `pnpm exec mint dev` from this folder.