import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
// Load the monorepo-root .env regardless of the process CWD.
loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import noxPlugin from "@iexec-nox/nox-hardhat-plugin";
import { configVariable, defineConfig } from "hardhat/config";

// Consumer config mirrored from @iexec-nox/nox-hardhat-plugin's example-project
// (plugins: [toolboxViem, nox], solidity 0.8.35, default edr-simulated op chain),
// extended with an Ethereum Sepolia (11155111) network for real deploys.
export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, noxPlugin],
  solidity: "0.8.35",
  networks: {
    default: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
