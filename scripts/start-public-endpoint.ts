/**
 * Single-process launcher for the PUBLIC hosted c402 endpoint (Render, one web service).
 *
 * A paid c402 call needs two of our services: the facilitator (relays the client's USDC
 * payment on-chain) and the CDE API (runs the confidential decision + writes the attestation).
 * Render exposes one port per service, so we run both here:
 *   - facilitator  -> internal port 4022 (not exposed)
 *   - cde-api      -> Render's $PORT     (the public URL, keep-alive target /health)
 * cde-api reaches the facilitator at http://localhost:4022.
 *
 * If either child exits we exit too, so Render restarts a clean pair.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const FACILITATOR_PORT = process.env.FACILITATOR_PORT ?? "4022";

const children: ChildProcess[] = [];
function run(name: string, entry: string, env: NodeJS.ProcessEnv) {
  const child = spawn(process.execPath, [resolve(root, entry)], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    console.error(`[launcher] ${name} exited (code ${code}) - shutting down so Render restarts a clean pair`);
    for (const c of children) if (c !== child) c.kill("SIGTERM");
    process.exit(code ?? 1);
  });
  children.push(child);
  return child;
}

async function waitForHealth(url: string, tries = 40, delayMs = 500) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`facilitator did not become healthy at ${url}`);
}

async function main() {
  console.log("[launcher] starting facilitator (internal) + cde-api (public)");
  run("facilitator", "apps/facilitator/index.ts", { FACILITATOR_PORT });
  await waitForHealth(`http://localhost:${FACILITATOR_PORT}/health`);
  console.log("[launcher] facilitator healthy - starting cde-api");
  run("cde-api", "apps/cde-api/index.ts", { FACILITATOR_URL: `http://localhost:${FACILITATOR_PORT}` });
}

main().catch((e) => {
  console.error("[launcher] fatal:", e);
  process.exit(1);
});
