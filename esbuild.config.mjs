import esbuild from "esbuild";
import process from "node:process";
import builtins from "builtin-modules";

const isProd = process.argv[2] === "production";

const ctx = await esbuild.context({
  entryPoints: ["main.ts"],
  bundle: true,
  outfile: "main.js",
  format: "cjs",
  platform: "browser",
  target: "es2020",
  sourcemap: isProd ? false : "inline",
  minify: isProd,
  external: ["obsidian", "electron", "@codemirror/state", "@codemirror/view", ...builtins],
  logLevel: "info"
});

if (isProd) {
  await ctx.rebuild();
  await ctx.dispose();
} else {
  await ctx.watch();
  console.log("Watching for changes...");
}