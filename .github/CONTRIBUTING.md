# Contributing to Katta Documentation

Thank you for helping improve Katta's documentation!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Enable Corepack so the pinned pnpm version is used: `corepack enable`
4. Install dependencies: `pnpm install`
5. Start development server: `pnpm start`

The dev server runs at `http://localhost:8000` with live reload.

This repo is pinned to pnpm via `packageManager` in `package.json`. npm and yarn are refused with a clear message.

## Making Changes

- Documentation files are in the `docs/` folder
- Use clear, concise language
- Include screenshots or examples where helpful
- Run `pnpm build` before you submit — it validates every internal link

Links between docs use `.md` paths. They resolve relative to the current file, with a fallback to the docs content root. So `[x](setup/SERVER_SETUP.md)` works from any page. Both `onBrokenLinks` and `markdown.hooks.onBrokenMarkdownLinks` are set to `throw`, so a broken link fails the build.

## Submitting Changes

1. Create a feature branch: `git checkout -b feature/improve-docs`
2. Make your changes and commit: `git commit -m "Improve setup instructions"`
3. Push to your fork: `git push origin feature/improve-docs`
4. Open a pull request against `main`

*Note: Branch names and commit messages above are examples. Use descriptive names that reflect your actual changes.*

## Guidelines

- Keep content up-to-date with the latest app versions
- Use consistent formatting and style
- Break up long sections with headings and lists
- Link to related documentation when relevant

## Adding or upgrading dependencies

`pnpm-workspace.yaml` sets `minimumReleaseAge: 4320` (3 days). pnpm will refuse to resolve any package version younger than that — most malicious releases are detected and unpublished within hours, so the delay protects us at near-zero cost.

If you genuinely need a fresh release sooner (e.g. a security fix just published), add the specific package/version to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` and call it out in the PR description.

Routine upgrades land via Dependabot (configured in `.github/dependabot.yml`), which opens monthly grouped PRs for npm dependencies and GitHub Actions. Please don't run `pnpm up --latest` on the default branch — review the Dependabot PR instead, or open a PR with explicit version pins and a changelog link.

GitHub Actions are pinned to commit SHAs with the version in a trailing comment. Keep that form when you add an action.

## Above All, Thank You for Your Contributions

Thank you for taking the time to contribute to the project! :+1:

Katta Team
