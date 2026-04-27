import type { Config } from "tailwindcss";

/**
 * Shadcn / tooling compatibility. Source paths are also declared in `src/index.css` via @source.
 */
const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
};

export default config;
