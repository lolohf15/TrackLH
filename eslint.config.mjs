import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// eslint-config-next 16 ships flat configs, so they're spread in directly —
// routing them through FlatCompat crashes on ESLint 9.
const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "public/**", "prisma/migrations/**"] },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
