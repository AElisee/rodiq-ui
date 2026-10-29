import { realpathSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Sur cPanel (CloudLinux), node_modules est un lien vers ~/nodevenv/… : hors du projet, Turbopack ne le compile pas.
// La racine devient l'ancêtre commun du projet et du vrai node_modules (en local, c'est le projet lui-même).
function racineCommune(): string {
  const projet = process.cwd();
  const modules = realpathSync(path.join(projet, "node_modules"));
  let racine = projet;
  while (path.relative(racine, modules).startsWith("..")) racine = path.dirname(racine);
  return racine;
}

const racine = racineCommune();

const nextConfig: NextConfig = {
  outputFileTracingRoot: racine,
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  // Renvoie la console du navigateur (dont les traces « [api] … » de lib/api/client.ts) vers le terminal de dev
  logging: {
    browserToTerminal: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: racine,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
