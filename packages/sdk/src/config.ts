import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  http,
  getAddress,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { createViemHandleClient } from "@iexec-nox/handle";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");

/** Load the monorepo-root .env once. */
loadEnv({ path: resolve(REPO_ROOT, ".env") });

export const EXPLORER = "https://sepolia.etherscan.io";

export interface XcatAddresses {
  cde: Address;
  registry: Address;
  meter: Address;
  eventBus: Address;
  safe: Address;
  usdc: Address;
  weth: Address;
  router: Address;
  uniswapPoolFee: number;
}

export interface XcatConfig {
  rpc: string;
  privateKey: Hex;
  cdeApiUrl: string;
  facilitatorUrl: string;
  addr: XcatAddresses;
}

function env(name: string, required = true): string {
  const v = process.env[name];
  if (!v && required) throw new Error(`Missing ${name} in .env`);
  return v ?? "";
}

export function loadConfig(): XcatConfig {
  let pk = env("SEPOLIA_PRIVATE_KEY");
  if (!pk.startsWith("0x")) pk = "0x" + pk;
  return {
    rpc: env("SEPOLIA_RPC_URL"),
    privateKey: pk as Hex,
    cdeApiUrl: env("CDE_API_URL", false) || "http://localhost:4021",
    facilitatorUrl: env("FACILITATOR_URL", false) || "http://localhost:4022",
    addr: {
      cde: getAddress(env("CDE_ADDRESS")),
      registry: getAddress(env("DECISION_REGISTRY_ADDRESS")),
      meter: getAddress(env("PAYMENT_METER_ADDRESS")),
      eventBus: getAddress(env("EVENT_BUS_ADDRESS")),
      safe: getAddress(env("SAFE_ADDRESS")),
      usdc: getAddress(env("USDC_ADDRESS")),
      weth: getAddress(env("WETH9_ADDRESS")),
      router: getAddress(env("UNISWAP_SWAP_ROUTER02")),
      uniswapPoolFee: Number(env("UNISWAP_POOL_FEE", false) || "500"),
    },
  };
}

export interface Clients {
  account: ReturnType<typeof privateKeyToAccount>;
  publicClient: PublicClient;
  walletClient: WalletClient;
}

export function makeClients(cfg: XcatConfig): Clients {
  const account = privateKeyToAccount(cfg.privateKey);
  const transport = http(cfg.rpc);
  return {
    account,
    publicClient: createPublicClient({ chain: sepolia, transport }),
    walletClient: createWalletClient({ account, chain: sepolia, transport }),
  };
}

export function handleClientFor(clients: Clients) {
  return createViemHandleClient(clients.walletClient);
}

/** Load a compiled contract ABI from contracts/artifacts. */
export function loadAbi(contract: string): Abi {
  const p = resolve(REPO_ROOT, `contracts/artifacts/contracts/${contract}.sol/${contract}.json`);
  return JSON.parse(readFileSync(p, "utf8")).abi as Abi;
}

export const ABIS = {
  cde: () => loadAbi("CDE"),
  registry: () => loadAbi("DecisionRegistry"),
  meter: () => loadAbi("PaymentMeter"),
  eventBus: () => loadAbi("EventBus"),
};
