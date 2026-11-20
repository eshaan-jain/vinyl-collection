// Static export: `next build` writes plain HTML to site/out, which GitHub Pages can serve.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
// externalDir: the site imports small shared helpers from ../lib (sorting, tracklist grouping, Spotify links).
export default { output: "export", basePath, images: { unoptimized: true }, trailingSlash: true, experimental: { externalDir: true } };
