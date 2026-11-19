// Static export: `next build` writes plain HTML to site/out, which GitHub Pages can serve.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
export default { output: "export", basePath, images: { unoptimized: true }, trailingSlash: true };
