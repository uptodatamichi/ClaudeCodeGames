
export const packageUrl: URL = new URL('../', import.meta.url);

export const buildinfoUrl: URL = new URL('buildinfo.txt', packageUrl);

export const distUrl: URL = new URL('dist/', packageUrl);
export const indexJsUrl: URL = new URL('index.bundle.js', distUrl);
export const indexCssUrl: URL = new URL('index.css', distUrl);
export const siteCssUrl: URL = new URL('site.css', distUrl);

export const assetsUrl: URL = new URL('assets/@scope/package-name/', packageUrl);
export const indexHtmlUrl: URL = new URL('index.html', assetsUrl);
export const webmanifestUrl: URL = new URL('manifest.webmanifest', assetsUrl);
export const faviconUrl: URL = new URL('favicon.svg', assetsUrl);
