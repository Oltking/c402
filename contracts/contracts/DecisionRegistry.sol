// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title DecisionRegistry
/// @notice Public, auditable log of confidential-decision commitments produced by
///         the CDE. The registry stores ONLY public metadata (an opaque commitment
///         hash + provenance) - never the decision itself, which stays encrypted in
///         the CDE and is decryptable only by the authorized runtime via Nox ACLs.
///         This is the on-chain proof surface for the `xcat verify <decisionId>` flow.
contract DecisionRegistry {
    struct Decision {
        uint256 id;
        bytes32 commitment; // keccak256 binding: cde | id | caller | block
        address cde; // engine that produced it
        address caller; // who requested the decision
        uint64 timestamp;
        uint256 blockNumber;
    }

    address public owner;
    mapping(address => bool) public isRecorder; // authorized CDE engines
    mapping(uint256 => Decision) private _decisions;
    uint256 public decisionCount;

    event RecorderSet(address indexed recorder, bool allowed);
    event DecisionCommitted(
        uint256 indexed id,
        bytes32 indexed commitment,
        address indexed cde,
        address caller,
        uint256 blockNumber
    );

    error NotOwner();
    error NotRecorder();
    error UnknownDecision();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setRecorder(address recorder, bool allowed) external onlyOwner {
        isRecorder[recorder] = allowed;
        emit RecorderSet(recorder, allowed);
    }

    /// @notice Called by an authorized CDE when it commits a decision.
    function record(uint256 id, bytes32 commitment, address caller) external {
        if (!isRecorder[msg.sender]) revert NotRecorder();
        _decisions[id] = Decision({
            id: id,
            commitment: commitment,
            cde: msg.sender,
            caller: caller,
            timestamp: uint64(block.timestamp),
            blockNumber: block.number
        });
        decisionCount++;
        emit DecisionCommitted(id, commitment, msg.sender, caller, block.number);
    }

    /// @notice Read a committed decision's public metadata. Used by `xcat verify`.
    function getDecision(uint256 id) external view returns (Decision memory) {
        Decision memory d = _decisions[id];
        if (d.commitment == bytes32(0)) revert UnknownDecision();
        return d;
    }

    /// @notice Recompute and check a commitment for a stored decision.
    function verify(
        uint256 id,
        bytes32 expectedCommitment
    ) external view returns (bool) {
        return _decisions[id].commitment == expectedCommitment;
    }
}
