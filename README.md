# YouEye Cinema

Movie and TV discovery app for the [YouEye](https://github.com/YouEye-Platform/YouEye) platform.

Cinema runs as a native YouEye app. It gives users a media discovery interface, dashboard widgets, and timeline info cards while keeping account, theme, and launch behavior consistent with the rest of YouEye.

Current public release line: `v0.5.0`

## Features

- Trending, popular, and top-rated movie and TV browsing
- Search and detail pages backed by a configured TMDB key
- Watchlists and user context surfaces
- Dashboard widgets for currently watched and trending titles
- Timeline info-card surface for movie and TV details
- App-owned settings panel for YouEye Settings
- Theme, language, and account menu integration
- PWA-ready build with service worker assets

## YouEye Surfaces

| Surface | Purpose |
|---|---|
| `/` | Main Cinema app |
| `/embed/widget/now-watching` | Dashboard now-watching widget |
| `/embed/widget/trending` | Dashboard trending widget |
| `/embed/card/movie` | Timeline/info-card surface |
| `/embed/settings` | App settings panel shown inside YouEye Settings |
| `/api/manifest` | Native app manifest consumed by Market and UI |
| `/api/health` | Container health and version endpoint |

## Development

```bash
pnpm install
pnpm dev
```

Cinema requires a TMDB API key configured through YouEye. The app uses Next.js 15, TypeScript, Tailwind CSS, and YouEye's native app surface contract.

## Release Artifact

The Control Panel updater expects each native app release to upload an uncompressed `standalone.tar` asset.

```bash
pnpm build
cd .next/standalone
tar -cf standalone.tar .
```

The release tag for this standalone repo is `v0.5.0` with no component prefix.

## License

YouEye source code is licensed under the [Business Source License 1.1](LICENSE). Each version converts to AGPL-3.0 after four years.

The "YouEye" name and logo are trademarks. See [TRADEMARK.md](TRADEMARK.md) for usage guidelines.
