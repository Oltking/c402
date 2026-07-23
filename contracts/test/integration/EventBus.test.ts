import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { nox } from "@iexec-nox/nox-hardhat-plugin";
import { stringToHex } from "viem";

describe("EventBus — confidential pub/sub", () => {
  it("publishes an encrypted payload decryptable only by the subscriber", { timeout: 180_000 }, async () => {
    const { viem } = await nox.connect();
    const [wallet] = await viem.getWalletClients();
    const subscriber = wallet.account.address;

    const bus = await viem.deployContract("EventBus", []);
    const topic = stringToHex("market-signal", { size: 32 });

    const payload = await nox.encryptInput(4242n, "uint256", bus.address);
    await bus.write.publish([topic, payload.handle, payload.handleProof, [subscriber]]);

    const id = (await bus.read.eventCount()) as bigint;
    assert.equal(id, 1n);

    // Public mapping of a struct flattens to a tuple → viem returns an array.
    const meta = (await bus.read.events([id])) as any;
    const publisher = (meta.publisher ?? meta[2]) as string;
    const subscriberCount = (meta.subscriberCount ?? meta[4]) as bigint;
    assert.equal(publisher.toLowerCase(), subscriber.toLowerCase());
    assert.equal(subscriberCount, 1n);

    const handle = (await bus.read.payloadOf([id])) as `0x${string}`;
    const { value } = await nox.decrypt(handle);
    assert.equal(value, 4242n);
  });
});
