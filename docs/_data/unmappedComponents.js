// Returns CEM entries that have no corresponding .md page in
// docs/pages/api/components/. Used by the component-stub template to
// auto-generate a minimal page for any newly added component, so the
// "every tag must have a page" invariant is maintained structurally
// rather than enforced by a CI check.

const fs = require("fs");
const path = require("path");

module.exports = () => {
  const cemPath = path.resolve(__dirname, "../../custom-elements.json");
  if (!fs.existsSync(cemPath)) return [];

  const manifest = JSON.parse(fs.readFileSync(cemPath, "utf-8"));
  const componentsDir = path.resolve(__dirname, "../pages/api/components");

  const existingTags = new Set(
    fs
      .readdirSync(componentsDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => `game-${f.replace(/\.md$/, "")}`),
  );

  const unmapped = [];
  for (const mod of manifest.modules || []) {
    for (const decl of mod.declarations || []) {
      if (
        decl.tagName &&
        decl.tagName !== "game-shell" &&
        !existingTags.has(decl.tagName)
      ) {
        unmapped.push({
          tagName: decl.tagName,
          name: decl.name,
          summary: decl.summary || "",
        });
      }
    }
  }

  return unmapped;
};
