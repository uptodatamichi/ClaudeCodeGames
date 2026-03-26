import { Hono, type Env } from 'hono';
import {
    buildinfoUrl,
    faviconUrl,
    indexCssUrl,
    indexHtmlUrl,
    indexJsUrl,
    siteCssUrl,
    webmanifestUrl
} from './constants.js';


type CreateSpaOptions = {
    basePath?: string,
    path?: string,
    metaDescriptionContent?: string,
    faviconPath?: string,
    webmanifestPath?: string,
    indexCssPath?: string,
    vAppContainerId?: string,
    indexJsPath?: string,
    siteCssPath?: string,
}
export function createSpa<E extends Env>(options: CreateSpaOptions): Hono<E> {

    const trimmedBasePath = options.basePath ? options.basePath.trim().replace(/^\/+/, '').replace(/\/+$/, '') : '';
    const trimmedPath = options.path ? options.path.trim().replace(/^\/+/, '').replace(/\/+$/, '') : '';
    const baseHref =
        (trimmedBasePath ? `/${trimmedBasePath}/` : '/')
        +
        (trimmedPath ? `${trimmedPath}/` : '')
        ;

    const spa = new Hono<E>().basePath(`/${trimmedPath}`);

    spa.get('/health', (c) => c.text('OK'));
    spa.get('/buildinfo', async (c) => {
        try {
            const buildInfo = await fetch(buildinfoUrl).then(res => res.text());
            return c.text(buildInfo);
        } catch (error) {
            throw error;
            return c.status(500);
        }
    });

    spa.get('/app/*', async (c) => {
        try {

            let indexHtml = await fetch(indexHtmlUrl).then(res => res.text());

            indexHtml = indexHtml.replace('<base href="/" />', `<base href="${baseHref}" />`);

            if (options.metaDescriptionContent)
                indexHtml = indexHtml.replace('<meta name="description" content="" />', `<meta name="description" content="${options.metaDescriptionContent}" />`);

            if (options.faviconPath)
                indexHtml = indexHtml.replace('<link rel="icon" href="favicon.svg" sizes="any" type="image/svg+xml" />', `<link rel="icon" href="${options.faviconPath}" sizes="any" type="image/svg+xml" />`);

            if (options.webmanifestPath)
                indexHtml = indexHtml.replace('<link rel="manifest" href="manifest.webmanifest" />', `<link rel="manifest" href="${options.webmanifestPath}" />`);

            if (options.vAppContainerId)
                indexHtml = indexHtml.replace('<div id="" class="v-app-container"></div>', `<div id="${options.vAppContainerId}" class="v-app-container"></div>`);

            if (options.indexJsPath)
                indexHtml = indexHtml.replace('<script type="module" src="index.js"></script>', `<script type="module" src="${options.indexJsPath}"></script>`);

            if (options.indexCssPath)
                indexHtml = indexHtml.replace('<link rel="stylesheet" href="index.css" />', `<link rel="stylesheet" href="${options.indexCssPath}" />`);

            if (options.siteCssPath)
                indexHtml = indexHtml.replace('<link rel="stylesheet" href="site.css" />', `<link rel="stylesheet" href="${options.siteCssPath}" />`);

            return c.html(indexHtml);

        } catch (error) {
            throw error;
            return c.status(500);
        }
    });

    spa.get(`/${options.faviconPath || 'favicon.svg'}`, async (c) => {
        try {
            const svg = await fetch(faviconUrl).then(res => res.text());
            return c.text(svg, 200, { 'Content-Type': 'image/svg+xml' });
        } catch (error) {
            throw error;
            return c.status(500);
        }
    });

    spa.get(`/${options.webmanifestPath || 'manifest.webmanifest'}`, async (c) => {
        try {
            const webmanifest = await fetch(webmanifestUrl).then(res => res.json());
            return c.json(webmanifest, 200, { 'Content-Type': 'application/manifest+json', });
        } catch (error) {
            throw error;
            return c.status(500);
        }
    });

    spa.get(`/${options.indexJsPath || 'index.js'}`, async (c) => {
        try {
            const js = await fetch(indexJsUrl).then(res => res.text());
            return c.text(js, 200, { 'Content-Type': 'application/javascript' });
        } catch (error) {
            throw error;
            return c.status(500);
        }
    });

    spa.get(`/${options.indexCssPath || 'index.css'}`, async (c) => {
        try {
            const css = await fetch(indexCssUrl).then(res => res.text());
            return c.text(css, 200, { 'Content-Type': 'text/css' });
        } catch (error) {
            throw error;
            return c.status(500);
        }
    });

    spa.get(`/${options.siteCssPath || 'site.css'}`, async (c) => {
        try {
            const css = await fetch(siteCssUrl).then(res => res.text());
            return c.text(css, 200, { 'Content-Type': 'text/css' });
        } catch (error) {
            throw error;
            return c.status(500);
        }
    });

    return spa;

}
