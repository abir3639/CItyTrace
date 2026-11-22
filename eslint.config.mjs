import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * Flat ESLint config for CITYTRACE.
 *
 * Next.js 16 removed the `next lint` command, so linting runs through the
 * ESLint CLI directly (`npm run lint`).
 */
const config = [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "scripts/**"],
  },
  ...coreWebVitals,
  ...typescript,
];

export default config;
