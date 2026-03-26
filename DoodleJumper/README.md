# Introduction

*&lt;INTRO TEXT&gt;*

## Table of Contents

1. [Quick Start](#quick-start)
2. [AI Assistant Context](#ai-assistant-context)
3. [Documentation](#documentation)
4. [DevOps](#devops)
    1. [Change Management](#change-management)
    2. [Publish](#publish)
        1. [npmjs.org](#npmjsorg)
        2. [Custom registry](#custom-registry)

# Quick Start

```bash
# remove dist/ and tsconfig.build.tsbuildinfo
bun run clean

# remove dist/ only
bun run clean:dist

# remove tsconfig.build.tsbuildinfo only
bun run clean:tsbuildinfo

# compile + bundle
bun run build

# run tests
bun run tests

# run src/dev.ts in watch mode
bun run dev
```

**Publish** - see [Publish](#publish).

# AI Assistant Context

To generate an AI coding assistant context file for this project:

> Generate an AI coding assistant context file. `README-template.md` is available now and documents the architectural conventions of this package — use it as your primary source. The generated context file must be self-contained: `README-template.md` will be deleted after context generation, so do not reference it in the output. Give particular attention to: the dual tsconfig setup and the import constraints it imposes, the `#src/*.js` alias and where it may and may not be used, the `./spa` export condition and createSpa() as the library's public API, the asset resolution via import.meta.url and why it is reliable when the package is loaded externalized, and the base href patching mechanism for client-side routing.

# Documentation

*&lt;DOCUMENTATION&gt;*

## Asset Resolution

*&lt;!-- Remove this section if the library has no runtime assets. Replace `@scope/lib-name` throughout with the actual package name. --&gt;*

Assets are placed under `assets/@scope/lib-name/` (scoped to the package name to prevent collisions). They are resolved at runtime via `import.meta.url` and loaded with `fetch()` (browser) or `readFile` (Node). `assets/` must be listed in `files` in `package.json`.

`import.meta.url` is reliable when the library is loaded as a discrete module (from CDN or `node_modules/`). When the consumer bundles the library, they must copy the assets - see below.

### For consumers bundling this library

Copy `node_modules/@scope/lib-name/assets/` into your build output alongside the bundle, preserving the relative path. No code configuration is required - only the file copy.

# DevOps

## Change Management

1. Create a new branch for the change.
2. Make the changes and commit.
3. Bump the version in [`package.json`](package.json).
4. Add an entry for the new version in [`CHANGELOG.md`](CHANGELOG.md).
5. Pull request the branch.
6. After merge, run `bun run build` - ensures artifacts are current before publish.
7. Publish.

## Publish

See the following sources to configure the target registry and authentication.

- [Configuring npm - `npmrc`](https://docs.npmjs.com/cli/v10/configuring-npm/npmrc)
- [Bun package manager - `install.registry`](https://bun.com/docs/runtime/bunfig#install-scopes)

⚠️ Package Scope and the authentication for the target registry must be aligned.

### `npmjs.org`

Publish to the public npm registry.

```powershell
# authenticate
npm login
# publish
bun publish --registry https://registry.npmjs.org/ --access public
```

### Custom registry

```bash
# placeholder:
    # <SCOPE_WITHOUT_AT: <SCOPE_WITHOUT_AT>
    # <REGISTRY_URL: <REGISTRY_URL>
    # <BUN_PUBLISH_AUTH_TOKEN: <BUN_PUBLISH_AUTH_TOKEN>
```

`~/.bunfig.toml` or `bunfig.toml`:

```toml
[install.scopes]
"<SCOPE_WITHOUT_AT>" = { url = "<REGISTRY_URL>", token = "$BUN_PUBLISH_AUTH_TOKEN" }
```

```powershell
# authenticate
$env:BUN_PUBLISH_AUTH_TOKEN = "<BUN_PUBLISH_AUTH_TOKEN>"
# publish
bun publish
```
