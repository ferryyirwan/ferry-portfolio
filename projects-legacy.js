// Keep old Projects bookmarks useful without a host-specific rewrite rule.
(() => {
  const aliases = {
    odds: "odds",
    indigenous: "marketplace",
    marketplace: "marketplace",
    fittrack: "fittrack-v2",
    "fittrack-v2": "fittrack-v2",
    nexatech: "nexatech",
    weather: "weather-analytics",
    "weather-analytics": "weather-analytics"
  };
  const fragment = window.location.hash.slice(1).toLowerCase();
  const gallery = fragment.endsWith("-gallery");
  const name = gallery ? fragment.slice(0, -8) : fragment;
  const slug = Object.hasOwn(aliases, name) ? aliases[name] : null;
  if (slug) {
    window.location.replace(`/projects/${slug}/${gallery ? "#gallery" : ""}`);
  } else if (window.location.pathname === "/projects.html") {
    // Never redirect /projects or /projects/ back to itself after host normalization.
    // Both overview files contain the full page, including when JavaScript is off.
    window.location.replace("/projects/");
  }
})();
