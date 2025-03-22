const postcss = require("postcss");
const postcssImport = require("postcss-import");
const postcssPresetEnv = require("postcss-preset-env");
const combineSelectors = require("postcss-combine-duplicated-selectors");
const cssnano = require("cssnano");
const path = require("path");
const fs = require("fs");
const glob = require("glob");
const { build } = require("esbuild");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const markdownItAnchor = require("markdown-it-anchor");
const { permalink } = markdownItAnchor;

const postcssPlugins = [
  postcssImport(),
  postcssPresetEnv({
    stage: 0,
    features: {
      "logical-properties-and-values": false,
      "prefers-color-scheme-query": false,
      "gap-properties": false,
      "custom-properties": false,
      "place-properties": false,
      "not-pseudo-class": false,
      "focus-visible-pseudo-class": false,
      "focus-within-pseudo-class": false,
      "color-functional-notation": false,
      "custom-media-queries": { preserve: false },
    },
  }),
  combineSelectors(),
  cssnano({ preset: "default" }),
];

function buildCSS(entryPoints) {
  for (const file of entryPoints) {
    const css = fs.readFileSync(file, "utf-8");
    postcss(postcssPlugins)
      .process(css, { from: file, to: `_site/${file}` })
      .then((res) => {
        fs.mkdirSync("_site/css", { recursive: true });
        fs.writeFileSync(`_site/${file}`, res.css);
      });
  }
}

function buildJS(examplePoints, demoPoints) {
  const builds = [];
  if (examplePoints.length)
    builds.push(
      build({
        entryPoints: examplePoints,
        minify: process.env.NODE_ENV !== "development",
        bundle: true,
        splitting: true,
        write: true,
        format: "esm",
        outdir: "_site",
        outbase: "..",
      }),
    );
  if (demoPoints.length)
    builds.push(
      build({
        entryPoints: demoPoints,
        minify: process.env.NODE_ENV !== "development",
        bundle: true,
        splitting: true,
        write: true,
        format: "esm",
        outdir: "_site",
        outbase: ".",
      }),
    );
  return Promise.all(builds);
}

// In watch mode, use esbuild's own file watcher so changes to ../src/**
// are picked up without relying on 11ty's addWatchTarget for out-of-tree files.
async function watchJS(examplePoints, demoPoints) {
  const { context } = require("esbuild");
  const ctxs = [];
  if (examplePoints.length) {
    const ctx = await context({
      entryPoints: examplePoints,
      minify: false,
      bundle: true,
      splitting: true,
      write: true,
      format: "esm",
      outdir: "_site",
      outbase: "..",
    });
    await ctx.watch();
    ctxs.push(ctx);
  }
  if (demoPoints.length) {
    const ctx = await context({
      entryPoints: demoPoints,
      minify: false,
      bundle: true,
      splitting: true,
      write: true,
      format: "esm",
      outdir: "_site",
      outbase: ".",
    });
    await ctx.watch();
    ctxs.push(ctx);
  }
  return ctxs;
}

// ---------------------------------------------------------------------------
// CEM shortcodes -- render component API tables from custom-elements.json
// ---------------------------------------------------------------------------

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cemLookup(cem, tag) {
  if (!cem || !cem[tag]) {
    return null;
  }
  return cem[tag];
}

function cemAttrs(cem, tag) {
  const el = cemLookup(cem, tag);
  if (!el || !el.attributes.length) return "";
  const rows = el.attributes.map((a) => {
    const prop = a.fieldName || "";
    const propCode = prop ? ` <code>.${escHtml(prop)}</code>` : "";
    const type = a.type?.text || "string";
    const dflt = a.default
      ? ` Defaults to <code>${escHtml(a.default)}</code>.`
      : "";
    const desc = a.description ? ` ${a.description}` : "";
    return (
      `<dt><span class="badge attr">${escHtml(a.name)}</span>${propCode}</dt>\n` +
      `<dd><code>${escHtml(type)}</code>${dflt}${desc}</dd>`
    );
  });
  return `<dl class="def">\n${rows.join("\n\n")}\n</dl>`;
}

function cemEvents(cem, tag) {
  const el = cemLookup(cem, tag);
  if (!el || !el.events.length) return "";
  const rows = el.events.map((e) => {
    const type = e.type?.text ? ` <code>${escHtml(e.type.text)}</code>` : "";
    const desc = e.description || "";
    return (
      `<dt><span class="badge event">${escHtml(e.name)}</span>${type}</dt>\n` +
      `<dd>${desc}</dd>`
    );
  });
  return `<dl class="def">\n${rows.join("\n\n")}\n</dl>`;
}

function cemMethods(cem, tag) {
  const el = cemLookup(cem, tag);
  if (!el || !el.methods.length) return "";
  const rows = el.methods.map((m) => {
    const params = (m.parameters || []).map((p) => p.name).join(", ");
    const sig = `${m.name}(${params})`;
    const desc = m.description || "";
    return (
      `<dt><span class="badge method">.${escHtml(sig)}</span></dt>\n` +
      `<dd>${desc}</dd>`
    );
  });
  return `<dl class="def">\n${rows.join("\n\n")}\n</dl>`;
}

function cemCssProps(cem, tag) {
  const el = cemLookup(cem, tag);
  if (!el || !el.cssProperties.length) return "";
  const rows = el.cssProperties.map((p) => {
    const dflt = p.default ? `<code>${escHtml(p.default)}</code>` : "";
    return `<tr><td><code>${escHtml(p.name)}</code></td><td>${dflt}</td><td>${p.description || ""}</td></tr>`;
  });
  return (
    `<table>\n<thead><tr><th>Property</th><th>Default</th><th>Description</th></tr></thead>\n` +
    `<tbody>\n${rows.join("\n")}\n</tbody>\n</table>`
  );
}

function cemCssParts(cem, tag) {
  const el = cemLookup(cem, tag);
  if (!el || !el.cssParts.length) return "";
  const rows = el.cssParts.map(
    (p) =>
      `<tr><td><code>${escHtml(p.name)}</code></td><td>${p.description || ""}</td></tr>`,
  );
  return (
    `<table>\n<thead><tr><th>Part</th><th>Description</th></tr></thead>\n` +
    `<tbody>\n${rows.join("\n")}\n</tbody>\n</table>`
  );
}

function cemCssStates(cem, tag) {
  const el = cemLookup(cem, tag);
  if (!el || !el.cssStates.length) return "";
  const rows = el.cssStates.map(
    (s) =>
      `<tr><td><code>:state(${escHtml(s.name)})</code></td><td>${s.description || ""}</td></tr>`,
  );
  return (
    `<table>\n<thead><tr><th>State</th><th>Description</th></tr></thead>\n` +
    `<tbody>\n${rows.join("\n")}\n</tbody>\n</table>`
  );
}

function cemSlots(cem, tag) {
  const el = cemLookup(cem, tag);
  if (!el || !el.slots.length) return "";
  const rows = el.slots.map(
    (s) =>
      `<tr><td>${s.name ? `<code>${escHtml(s.name)}</code>` : "<em>(default)</em>"}</td><td>${s.description || ""}</td></tr>`,
  );
  return (
    `<table>\n<thead><tr><th>Slot</th><th>Description</th></tr></thead>\n` +
    `<tbody>\n${rows.join("\n")}\n</tbody>\n</table>`
  );
}

module.exports = (eleventyConfig) => {
  eleventyConfig.addPlugin(syntaxHighlight);

  eleventyConfig.amendLibrary("md", (mdLib) => {
    mdLib.use(markdownItAnchor, {
      permalink: permalink.headerLink(),
      slugify: (s) =>
        s
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim(),
    });
  });

  // CEM shortcodes -- use in templates as {% cem_attrs "game-timer" %}
  // or with a variable: {% cem_attrs cemTag %}
  eleventyConfig.addShortcode("cem_attrs", function (tag) {
    return cemAttrs(this.ctx?.cem || this.ctx?.environments?.cem, tag);
  });
  eleventyConfig.addShortcode("cem_methods", function (tag) {
    return cemMethods(this.ctx?.cem || this.ctx?.environments?.cem, tag);
  });
  eleventyConfig.addShortcode("cem_events", function (tag) {
    return cemEvents(this.ctx?.cem || this.ctx?.environments?.cem, tag);
  });
  eleventyConfig.addShortcode("cem_cssprops", function (tag) {
    return cemCssProps(this.ctx?.cem || this.ctx?.environments?.cem, tag);
  });
  eleventyConfig.addShortcode("cem_cssparts", function (tag) {
    return cemCssParts(this.ctx?.cem || this.ctx?.environments?.cem, tag);
  });
  eleventyConfig.addShortcode("cem_cssstates", function (tag) {
    return cemCssStates(this.ctx?.cem || this.ctx?.environments?.cem, tag);
  });
  eleventyConfig.addShortcode("cem_slots", function (tag) {
    return cemSlots(this.ctx?.cem || this.ctx?.environments?.cem, tag);
  });

  // Collection of all component doc pages, each enriched with its CEM entry.
  // Used by the index page and for prev/next navigation.
  eleventyConfig.addCollection("gameComponents", (api) => {
    return api
      .getFilteredByGlob("pages/api/components/*.md")
      .sort((a, b) => (a.data.title || "").localeCompare(b.data.title || ""));
  });

  // ---------------------------------------------------------------------------
  // Build-time lint checks (formerly scripts/check-docs.js checks 1 & 2)
  // ---------------------------------------------------------------------------
  //
  // Throwing here stops the build with a non-zero exit code, the same as a
  // failed CI step.  These run on full builds only (not incremental watch
  // rebuilds), matching the semantics of the old standalone script.

  eleventyConfig.on("eleventy.before", () => {
    const ROOT = path.resolve(__dirname, "..");
    const cemPath = path.join(ROOT, "custom-elements.json");

    // CEM may not exist on the very first run before `npm run cem`; skip.
    if (!fs.existsSync(cemPath)) return;

    const cem = JSON.parse(fs.readFileSync(cemPath, "utf-8"));
    const knownTags = new Set();
    for (const mod of cem.modules) {
      for (const ex of mod.exports ?? []) {
        if (
          ex.kind === "custom-element-definition" &&
          ex.name?.startsWith("game-")
        ) {
          knownTags.add(ex.name);
        }
      }
    }

    const errors = [];

    function walkFiles(dir, ext, out = []) {
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        if (fs.statSync(p).isDirectory()) walkFiles(p, ext, out);
        else if (name.endsWith(ext)) out.push(p);
      }
      return out;
    }

    // Check 1 — unknown <game-*> tags in examples and code fences
    function checkGameTags(src, label) {
      for (const [, tag] of src.matchAll(/<(game-[\w-]+)/g)) {
        if (!knownTags.has(tag)) {
          errors.push(`Unknown element <${tag}> in ${label}`);
        }
      }
    }

    for (const f of walkFiles(path.join(ROOT, "examples"), ".html")) {
      checkGameTags(fs.readFileSync(f, "utf-8"), path.relative(ROOT, f));
    }
    for (const f of walkFiles(path.join(ROOT, "docs/pages"), ".md")) {
      const src = fs.readFileSync(f, "utf-8");
      for (const [, fence] of src.matchAll(/```html([\s\S]*?)```/g)) {
        checkGameTags(fence, path.relative(ROOT, f));
      }
    }

    // Check 2 — deprecated htmlgamekit/src/ import paths
    const BAD_IMPORT = /(?:import\s.*?|src=["'])htmlgamekit\/src\//;
    for (const f of walkFiles(path.join(ROOT, "docs/pages"), ".md")) {
      if (BAD_IMPORT.test(fs.readFileSync(f, "utf-8"))) {
        errors.push(
          `Deprecated import path 'htmlgamekit/src/' in ${path.relative(ROOT, f)}`,
        );
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `\nDoc lint failed:\n${errors.map((e) => `  ${e}`).join("\n")}`,
      );
    }
  });

  // Watch the CEM manifest for changes
  eleventyConfig.addWatchTarget("../custom-elements.json");

  // CSS pipeline
  const cssEntryPoints = glob.sync("css/*.css");
  eleventyConfig.addWatchTarget("css/*.css");
  buildCSS(cssEntryPoints);

  // JS pipeline for examples and demos (bundle library imports inline).
  // Examples live in ../examples/ (one canonical location); demos in docs/demos/.
  const examplePoints = glob.sync("../examples/**/*.js");
  const demoPoints = glob.sync("demos/**/*.js");
  // In watch/serve mode, hand off to esbuild's own watcher so changes to
  // ../src/** are detected automatically (11ty's addWatchTarget is unreliable
  // for out-of-tree paths). In production, use a one-shot build.
  const isWatch = process.argv.some((a) => a === "--serve" || a === "--watch");
  if (isWatch) {
    watchJS(examplePoints, demoPoints);
  } else {
    buildJS(examplePoints, demoPoints);
  }

  eleventyConfig.on("beforeWatch", (changedFiles) => {
    changedFiles = changedFiles.map((p) => path.relative(process.cwd(), p));
    if (changedFiles.some((f) => f.startsWith("css/"))) {
      buildCSS(cssEntryPoints);
    }
    // JS rebuilds are handled by esbuild's own watcher in serve mode;
    // only run a manual rebuild here for production-style one-shot runs.
    if (
      !isWatch &&
      (changedFiles.some((f) => f.startsWith("../examples/")) ||
        changedFiles.some((f) => f.startsWith("demos/")) ||
        changedFiles.some((f) => f.startsWith("../src/")))
    ) {
      buildJS(glob.sync("../examples/**/*.js"), glob.sync("demos/**/*.js"));
    }
  });

  // Passthrough: library source
  eleventyConfig.addPassthroughCopy({ "../src": "src" });

  // Copy non-JS example files (HTML, CSS) into _site/examples/ preserving structure.
  // JS files are handled by esbuild above.
  for (const file of glob.sync("../examples/**/*.{html,css}")) {
    // file = "../examples/minimal/index.html"
    // dest key must be relative to docs/ input dir; value is the output path
    const dest = file.replace(/^\.\.\//, ""); // "examples/minimal/index.html"
    eleventyConfig.addPassthroughCopy({ [file]: dest });
  }

  // Markdown pages in pages/ directory
  // (11ty processes them automatically)

  return {
    dir: {
      input: ".",
      output: "_site",
      layouts: "_layouts",
      includes: "_includes",
      data: "_data",
    },
    pathPrefix: "/",
  };
};
