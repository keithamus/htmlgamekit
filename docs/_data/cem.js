// Loads the Custom Elements Manifest and indexes declarations by tag name.
// Available in templates as `cem` -- e.g. `cem["game-timer"].attributes`.

const fs = require("fs");
const path = require("path");

module.exports = () => {
  const manifestPath = path.resolve(__dirname, "../../custom-elements.json");
  if (!fs.existsSync(manifestPath)) return {};

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const byTag = {};

  for (const mod of manifest.modules || []) {
    for (const decl of mod.declarations || []) {
      if (!decl.tagName) continue;
      byTag[decl.tagName] = {
        tagName: decl.tagName,
        name: decl.name,
        summary: decl.summary || "",
        description: decl.description || "",
        attributes: decl.attributes || [],
        members: (decl.members || []).filter((m) => m.kind === "field"),
        methods: (decl.members || []).filter(
          (m) =>
            m.kind === "method" &&
            !m.name.startsWith("#") &&
            !m.name.startsWith("_"),
        ),
        events: decl.events || [],
        cssProperties: decl.cssProperties || [],
        cssParts: decl.cssParts || [],
        cssStates: decl.cssStates || [],
        slots: decl.slots || [],
        superclass: decl.superclass?.name || null,
        module: mod.path,
      };
    }
  }

  return byTag;
};
