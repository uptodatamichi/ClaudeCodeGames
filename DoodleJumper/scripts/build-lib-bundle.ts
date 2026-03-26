import { readFileSync } from 'fs';
import { join } from 'path';
import CDN_REWRITE_MAP from './cdn-rewrite-map.json';


interface ExportConditions {
    [key: string]: string | undefined;
    import?: string;
    types?: string;
    browser?: string;
    entrypoint?: string;
}

interface DependencyMap {
    [packageName: string]: string;
}

interface PackageManifest {
    version: string;
    exports?: Record<string, ExportConditions>;
    dependencies?: DependencyMap;
    devDependencies?: DependencyMap;
    peerDependencies?: DependencyMap;
}

function getManifest(packageIdentifier?: string): PackageManifest {

    const manifestPath = packageIdentifier
        ? join('node_modules', packageIdentifier, 'package.json')
        : 'package.json';

    let manifest: PackageManifest;
    try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    } catch {
        if (packageIdentifier)
            throw new Error("[scripts/build-lib-bundle.ts] Could not read manifest for '" + packageIdentifier + "' at '" + manifestPath + "'. Is it installed?");
        else
            throw new Error("[scripts/build-lib-bundle.ts] Could not read package manifest at '" + manifestPath + "'.");
    }

    return manifest;

}

function getManifestEntrypoints(packageManifest: PackageManifest): string[] {

    const exports = packageManifest.exports;
    if (!exports) throw new Error('[scripts/build-lib-bundle.ts] No exports field found in package.json.');

    const entrypoints = Object.entries(exports)
        .map(([key, conditions]) => {
            if (!conditions.entrypoint) throw new Error(`[scripts/build-lib-bundle.ts] Export '${key}' does not have an 'entrypoint' condition.`);
            return conditions.entrypoint;
        });

    return entrypoints;

}

function getPackageVersion(manifest: PackageManifest, packageIdentifier?: string): string {

    let version: string | undefined;
    if (packageIdentifier) {

        const dependencies = {
            ...manifest.dependencies,
            ...manifest.devDependencies,
            ...manifest.peerDependencies,
        };

        version = dependencies[packageIdentifier];
        if (!version) throw new Error(`[scripts/build-lib-bundle.ts] Package '${packageIdentifier}' is not listed in dependencies.`);

    }
    else {
        if (!manifest.version) throw new Error('[scripts/build-lib-bundle.ts] Package manifest does not contain a version field.');
        version = manifest.version;
    }

    return version;

}

function resolveCdnUrl(importSpecifier: string, urlTemplate: string): string {
    const manifest = getManifest();
    const version = getPackageVersion(manifest, importSpecifier);
    return urlTemplate.replace('<VERSION>', version);
}

const cdnRewritePlugin = {
    name: 'cdn-rewrite',
    setup(build: any) {

        const resolved = new Map<string, string>();
        for (const [importSpecifier, urlTemplate] of Object.entries(CDN_REWRITE_MAP) as [string, string][]) {
            const url = resolveCdnUrl(importSpecifier, urlTemplate);
            resolved.set(importSpecifier, url);
            console.log(`[cdn-rewrite] '${importSpecifier}' → '${url}'`);
        }

        build.onResolve({ filter: /\*/ }, (args: any) => {
            const url = resolved.get(args.path);
            if (url) return { path: url, external: true };
        });

    },
};


const entrypoints = getManifestEntrypoints(getManifest());
console.log('[scripts/build-lib-bundle.ts] Entrypoints:', entrypoints);

let buildResult;

console.log('[scripts/build-lib-bundle.ts] Starting ESM bundle build...');
buildResult = await Bun.build({
    entrypoints,
    outdir: 'dist',
    naming: '[dir]/[name].bundle.[ext]',
    target: 'browser',
    format: 'esm',
    minify: true,
    sourcemap: 'external',
    plugins: [cdnRewritePlugin],
});

if (!buildResult.success) {
    console.error('[scripts/build-lib-bundle.ts] Build failed:');
    for (const message of buildResult.logs) {
        console.error(message);
    }
    process.exit(1);
}
console.log('[scripts/build-lib-bundle.ts] ESM bundle build completed successfully.');

console.log('[scripts/build-lib-bundle.ts] Starting IIFE bundle build...');
buildResult = await Bun.build({
    entrypoints,
    outdir: 'dist',
    naming: '[dir]/[name].iife.[ext]',
    target: 'browser',
    format: 'iife',
    minify: true,
    sourcemap: 'external',
    plugins: [cdnRewritePlugin],
});

if (!buildResult.success) {
    console.error('[scripts/build-lib-bundle.ts] Build failed:');
    for (const message of buildResult.logs) {
        console.error(message);
    }
    process.exit(1);
}
console.log('[scripts/build-lib-bundle.ts] IIFE bundle build completed successfully.');
