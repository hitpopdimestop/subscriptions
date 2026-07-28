import "@testing-library/jest-dom/vitest";

// jsdom does not implement `window.matchMedia`. The theme hook needs it to read
// the OS colour-scheme signal, so provide a light-mode stub in jsdom suites.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
