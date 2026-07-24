// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Nox, euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/// @title EventBus
/// @notice Confidential on-chain pub/sub. A publisher (e.g. the Market Agent) posts an
///         ENCRYPTED payload handle under a plaintext topic and grants selective
///         decryption to a set of subscribers (e.g. the Treasury Agent) via Nox ACLs.
///         The public sees that an event was published and by whom - never its contents.
contract EventBus {
    struct EventMeta {
        uint256 id;
        bytes32 topic;
        address publisher;
        uint64 timestamp;
        uint256 subscriberCount;
    }

    mapping(uint256 => EventMeta) public events;
    mapping(uint256 => euint256) private _payload; // ACL-gated encrypted payload
    uint256 public eventCount;

    event EventPublished(uint256 indexed id, bytes32 indexed topic, address indexed publisher);

    /// @notice Publish an encrypted payload to `subscribers` under `topic`.
    function publish(
        bytes32 topic,
        externalEuint256 payloadExt,
        bytes calldata payloadProof,
        address[] calldata subscribers
    ) external returns (uint256 id) {
        euint256 payload = Nox.fromExternal(payloadExt, payloadProof);

        id = ++eventCount;
        _payload[id] = payload;
        Nox.allowThis(payload); // persist so subscribers can read it in a later tx
        for (uint256 i = 0; i < subscribers.length; i++) {
            Nox.allow(payload, subscribers[i]);
        }

        events[id] = EventMeta({
            id: id,
            topic: topic,
            publisher: msg.sender,
            timestamp: uint64(block.timestamp),
            subscriberCount: subscribers.length
        });
        emit EventPublished(id, topic, msg.sender);
    }

    /// @notice The encrypted payload handle for an event (decryptable only by ACL'd subscribers).
    function payloadOf(uint256 id) external view returns (euint256) {
        return _payload[id];
    }
}
