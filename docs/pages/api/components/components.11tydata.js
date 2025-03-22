// Directory data for all component pages.
// Sets the default layout and computes the CEM tag from the file slug so
// shortcodes and the component layout can look up the right manifest entry
// without every page having to repeat the tag name.
//
// Convention: "timer.md" → cemTag "game-timer". All component page filenames
// must match the tag name with the "game-" prefix stripped.

module.exports = {
  layout: "component",
  eleventyComputed: {
    cemTag: (data) => `game-${data.page.fileSlug}`,
  },
};
