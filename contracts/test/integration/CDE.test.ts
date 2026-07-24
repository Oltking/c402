import { strict as assert } from "node:assert";
import { before, describe, it } from "node:test";
import { nox } from "@iexec-nox/nox-hardhat-plugin";

// Policy fixture (bps): hedge if exposure > 5000; accumulate if signal > 100.
const HEDGE_THRESHOLD = 5000n;
const SIGNAL_THRESHOLD = 100n;

const ACTION_HOLD = 0n;
const ACTION_HEDGE = 1n;
const ACTION_ACCUMULATE = 2n;
const CONF_STRONG = 100n;
const CONF_MEDIUM = 60n;
const CONF_LOW = 20n;

describe("CDE - Confidential Decision Engine (end-to-end on Nox stack)", () => {
  let viem: Awaited<ReturnType<typeof nox.connect>>["viem"];
  let runtime: `0x${string}`;
  let registry: any;
  let cde: any;

  before(async () => {
    const conn = await nox.connect();
    viem = conn.viem;
    const [wallet] = await viem.getWalletClients();
    // The connected wallet doubles as the treasury runtime so nox.decrypt() (which
    // signs as this account) is inside the action's ACL.
    runtime = wallet.account.address;

    registry = await viem.deployContract("DecisionRegistry", []);
    cde = await viem.deployContract("CDE", [registry.address, runtime]);
    await registry.write.setRecorder([cde.address, true]);

    // Owner sets the encrypted policy.
    const hedge = await nox.encryptInput(HEDGE_THRESHOLD, "uint256", cde.address);
    const signal = await nox.encryptInput(SIGNAL_THRESHOLD, "uint256", cde.address);
    await cde.write.setPolicy([
      hedge.handle,
      hedge.handleProof,
      signal.handle,
      signal.handleProof,
    ]);
  });

  async function decide(exposure: bigint, signal: bigint): Promise<bigint> {
    const e = await nox.encryptInput(exposure, "uint256", cde.address);
    const s = await nox.encryptInput(signal, "uint256", cde.address);
    await cde.write.decide([e.handle, e.handleProof, s.handle, s.handleProof]);
    return (await cde.read.decisionCount()) as bigint;
  }

  async function readAction(id: bigint): Promise<bigint> {
    const handle = (await cde.read.actionOf([id])) as `0x${string}`;
    const { value } = await nox.decrypt(handle);
    return value;
  }

  async function readConfidence(id: bigint): Promise<bigint> {
    const handle = (await cde.read.confidenceOf([id])) as `0x${string}`;
    const { value } = await nox.publicDecrypt(handle);
    return value;
  }

  it("HEDGE: exposure over threshold", { timeout: 180_000 }, async () => {
    const id = await decide(6000n, 50n);
    assert.equal(await readAction(id), ACTION_HEDGE);
    assert.equal(await readConfidence(id), CONF_STRONG);
  });

  it("ACCUMULATE: exposure low, signal strong", { timeout: 180_000 }, async () => {
    const id = await decide(1000n, 250n);
    assert.equal(await readAction(id), ACTION_ACCUMULATE);
    assert.equal(await readConfidence(id), CONF_MEDIUM);
  });

  it("HOLD: exposure low, signal weak", { timeout: 180_000 }, async () => {
    const id = await decide(1000n, 50n);
    assert.equal(await readAction(id), ACTION_HOLD);
    assert.equal(await readConfidence(id), CONF_LOW);
  });

  it("records a public commitment in the registry", { timeout: 60_000 }, async () => {
    const count = (await registry.read.decisionCount()) as bigint;
    assert.ok(count >= 3n, "registry should have logged commitments");
    const d = (await registry.read.getDecision([1n])) as any;
    assert.equal(d.cde.toLowerCase(), cde.address.toLowerCase());
    assert.notEqual(d.commitment, `0x${"0".repeat(64)}`);
  });
});
