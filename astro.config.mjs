// @ts-check
import { defineConfig } from 'astro/config';

// Static field guide. No adapter, no SSR — `npm run build` emits plain files to /dist.
export default defineConfig({
  site: 'https://peru-field-guide.netlify.app',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    // The whole guide is one page; inlining the stylesheet removes the only
    // render-blocking request and keeps the offline cache to fonts + icons.
    inlineStylesheets: 'always',
  },
  compressHTML: true,
  devToolbar: { enabled: false },
});
