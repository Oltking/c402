import { stringToHex, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";
import type { Clients, XcatConfig } from "./config.ts";
import { ABIS, handleClientFor } from "./config.ts";

/** Publish an encrypted payload to `subscribers` on the EventBus. Returns the eventId. */
export async function publishEncrypted(
  clients: Clients,
  cfg: XcatConfig,
  topic: string,
  value: bigint,
  subscribers: Address[],
): Promise<{ eventId: bigint; tx: Hex }> {
  const abi = ABIS.eventBus();
  const h = await handleClientFor(clients);
  const enc = await h.encryptInput(value, "uint256", cfg.addr.eventBus);

  const tx = await clients.walletClient.writeContract({
    address: cfg.addr.eventBus, abi, functionName: "publish",
    args: [stringToHex(topic, { size: 32 }), enc.handle, enc.handleProof, subscribers],
    account: clients.account, chain: sepolia,
  });
  await clients.publicClient.waitForTransactionReceipt({ hash: tx });
  const eventId = (await clients.publicClient.readContract({ address: cfg.addr.eventBus, abi, functionName: "eventCount" })) as bigint;
  return { eventId, tx };
}

/** Consume (decrypt) an event payload as an ACL'd subscriber. Retries transient gateway states. */
export async function consumeEvent(clients: Clients, cfg: XcatConfig, eventId: bigint): Promise<bigint> {
  const abi = ABIS.eventBus();
  const handle = (await clients.publicClient.readContract({ address: cfg.addr.eventBus, abi, functionName: "payloadOf", args: [eventId] })) as Hex;
  const h = await handleClientFor(clients);
  for (let i = 0; i < 30; i++) {
    try {
      const { value } = await h.decrypt(handle);
      return value;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (/access_denied|not a viewer|status:\s*403|not yet computed/i.test(msg) && i < 29) {
        await new Promise((r) => setTimeout(r, 6000));
        continue;
      }
      throw e;
    }
  }
  throw new Error("failed to decrypt event payload");
}
