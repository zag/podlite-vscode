/* eslint-disable no-undef */
// eslint-disable-next-line @typescript-eslint/no-var-requires
import esbuild from "esbuild"
import { copy } from "esbuild-plugin-copy";

(async () => {
  const extensionConfig = {
    bundle: true,
    entryPoints: ["src/extension.tsx"],
    external: ["vscode", "esbuild"],
    format: "cjs",
    outdir: "out",
    platform: "node",
    sourcemap: true,
    loader: { ".node": "file" },
    assetNames: "[name]",
    plugins: [
      copy({
        resolveFrom: "cwd",
        assets: [
        ],
        watch: true,
      }),
    ]
  }

  const webConfig = {
    bundle: true,
    external: ["vscode"],
    entryPoints: ["src/webview/index.tsx"],
    outfile: "out/sidebar.js",
    sourcemap: true,
    plugins: [],
  }

  const flags = process.argv.slice(2);

  if (flags.includes("--watch")) {
    const ctx = await esbuild.context(webConfig);
    const ectx = await esbuild.context(extensionConfig);
    await ctx.watch();
    await ectx.watch();
  } else {
    await esbuild.build(webConfig);
    await esbuild.build(extensionConfig);
  }
})()