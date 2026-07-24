// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Nox, euint256, ebool, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {DecisionRegistry} from "./DecisionRegistry.sol";

/// @title CDE - Confidential Decision Engine
/// @notice Reusable "pay-per-confidential-decision" primitive. Takes encrypted
///         market signal + encrypted portfolio exposure, evaluates an encrypted
///         policy entirely inside the Nox TEE using BRANCHLESS `Nox.select` (so the
///         chosen action never leaks via reverts or gas), and:
///           1. records a PUBLIC commitment in the DecisionRegistry (auditable);
///           2. grants SELECTIVE decryption of the action to the treasury runtime only;
///           3. marks a coarse confidence bucket publicly decryptable for the UI.
///
///         Confidentiality, not anonymity: addresses & calls are public; the values
///         (thresholds, exposure, signal, action) stay encrypted.
contract CDE {
    // Plaintext action codes (the *mapping* is public; the *chosen* code is encrypted).
    uint256 internal constant ACTION_HOLD = 0;
    uint256 internal constant ACTION_HEDGE = 1;
    uint256 internal constant ACTION_ACCUMULATE = 2;

    // Coarse public confidence buckets (do not leak raw inputs).
    uint256 internal constant CONF_STRONG = 100;
    uint256 internal constant CONF_MEDIUM = 60;
    uint256 internal constant CONF_LOW = 20;

    address public owner;
    DecisionRegistry public immutable registry;
    /// @notice The only address permitted to decrypt decision actions.
    address public treasuryRuntime;

    // Encrypted policy state (set by owner).
    euint256 private _hedgeThreshold; // exposure (bps) above which we hedge
    euint256 private _signalThreshold; // signal strength above which we accumulate
    bool public policyInitialized;

    uint256 public decisionCount;
    mapping(uint256 => euint256) public actionOf; // ACL-gated: treasuryRuntime only
    mapping(uint256 => euint256) public confidenceOf; // publicly decryptable

    event PolicyUpdated(address indexed by);
    event TreasuryRuntimeUpdated(address indexed runtime);
    event DecisionCommitted(uint256 indexed id, bytes32 commitment, address indexed caller);

    error NotOwner();
    error PolicyNotSet();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(DecisionRegistry registry_, address treasuryRuntime_) {
        owner = msg.sender;
        registry = registry_;
        treasuryRuntime = treasuryRuntime_;

        // Encrypted state MUST be explicitly initialized; keep persistent access.
        _hedgeThreshold = Nox.toEuint256(0);
        Nox.allowThis(_hedgeThreshold);
        _signalThreshold = Nox.toEuint256(0);
        Nox.allowThis(_signalThreshold);
    }

    function setTreasuryRuntime(address runtime) external onlyOwner {
        treasuryRuntime = runtime;
        emit TreasuryRuntimeUpdated(runtime);
    }

    /// @notice Owner sets the encrypted policy thresholds from external encrypted inputs.
    function setPolicy(
        externalEuint256 hedgeThresholdExt,
        bytes calldata hedgeProof,
        externalEuint256 signalThresholdExt,
        bytes calldata signalProof
    ) external onlyOwner {
        _hedgeThreshold = Nox.fromExternal(hedgeThresholdExt, hedgeProof);
        Nox.allowThis(_hedgeThreshold); // used in a later decide() tx → must persist
        Nox.allow(_hedgeThreshold, owner);

        _signalThreshold = Nox.fromExternal(signalThresholdExt, signalProof);
        Nox.allowThis(_signalThreshold);
        Nox.allow(_signalThreshold, owner);

        policyInitialized = true;
        emit PolicyUpdated(msg.sender);
    }

    /// @notice Submit encrypted market signal + portfolio exposure; returns a decisionId.
    ///         Policy: exposure > hedgeThreshold                 -> HEDGE      (conf 100)
    ///                 else signal   > signalThreshold           -> ACCUMULATE (conf 60)
    ///                 else                                       -> HOLD       (conf 20)
    ///         Evaluated branchlessly so the outcome is not observable on-chain.
    function decide(
        externalEuint256 exposureExt,
        bytes calldata exposureProof,
        externalEuint256 signalExt,
        bytes calldata signalProof
    ) external returns (uint256 id) {
        if (!policyInitialized) revert PolicyNotSet();

        euint256 exposure = Nox.fromExternal(exposureExt, exposureProof);
        euint256 signal = Nox.fromExternal(signalExt, signalProof);

        ebool over = Nox.gt(exposure, _hedgeThreshold);
        ebool strong = Nox.gt(signal, _signalThreshold);

        // action = over ? HEDGE : (strong ? ACCUMULATE : HOLD)
        euint256 elseBranch = Nox.select(
            strong,
            Nox.toEuint256(ACTION_ACCUMULATE),
            Nox.toEuint256(ACTION_HOLD)
        );
        euint256 action = Nox.select(over, Nox.toEuint256(ACTION_HEDGE), elseBranch);

        // confidence = over ? 100 : (strong ? 60 : 20)
        euint256 confElse = Nox.select(
            strong,
            Nox.toEuint256(CONF_MEDIUM),
            Nox.toEuint256(CONF_LOW)
        );
        euint256 confidence = Nox.select(over, Nox.toEuint256(CONF_STRONG), confElse);

        id = ++decisionCount;

        // Selective decryption: contract keeps access; only the runtime can decrypt.
        actionOf[id] = action;
        Nox.allowThis(action);
        Nox.allow(action, treasuryRuntime);

        // Confidence is public (UI reads it) but reveals only a coarse bucket.
        confidenceOf[id] = confidence;
        Nox.allowThis(confidence);
        Nox.allowPublicDecryption(confidence);

        bytes32 commitment = keccak256(
            abi.encodePacked(address(this), id, msg.sender, block.timestamp, block.number)
        );
        registry.record(id, commitment, msg.sender);
        emit DecisionCommitted(id, commitment, msg.sender);
    }

    /// @notice Recompute the commitment for a decision recorded in the same block context.
    ///         (Off-chain `xcat verify` reconstructs this from event/registry data.)
    function commitmentFor(
        uint256 id,
        address caller,
        uint256 timestamp,
        uint256 blockNumber
    ) external view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), id, caller, timestamp, blockNumber));
    }
}
