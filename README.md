# Katta Documentation

Official documentation site for Katta. Built with [Docusaurus](https://docusaurus.io/).

## Contributing

We welcome contributions! Please read our [contributing guidelines](.github/CONTRIBUTING.md) for details on how to help.

## Quick Start

This repo uses [pnpm](https://pnpm.io/) (pinned via `packageManager` in `package.json`). The easiest way to get a matching version is to enable [Corepack](https://nodejs.org/api/corepack.html): `corepack enable`.

```bash
pnpm install
pnpm start
```

Opens dev server at `http://localhost:8000` with live reload.

## Structure

- `docs/introduction.md`, `docs/concepts.md`, `docs/glossary.md` - the pages every reader needs.
- `docs/user-guide/` - User Guide - for people who use Katta.
- `docs/admin-guide/` - Admin Guide - for people who administer a Katta Server.
- `docs/self-hosting-guide/` - Self-Hosting Guide - for people who run one.
- `docs/architecture/` - Architecture - how Katta works internally.
- `docs/img/` - Resources

## Scripts

```bash
pnpm build # Build static site
pnpm serve # Serve built site locally
```

Other scripts can be found in `package.json`.

## Deployment

Deployed to [docs.katta.cloud](https://docs.katta.cloud) via GitHub Pages from the `main` branch.

## License

This documentation is licensed under the [Creative Commons Attribution-ShareAlike 4.0 International License (CC-BY-SA 4.0)](LICENSE.txt).

## Acknowledgements

Based on [Cryptomator Docs](https://github.com/cryptomator/docs/).