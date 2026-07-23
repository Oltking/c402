// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Nox, euint256, ebool, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {DecisionRegistry} from "./DecisionRegistry.sol";

/// @title PayrollCDE — a SECOND confidential decision engine, on the same c402 protocol.
/// @notice Proves c402 generalizes beyond treasury: a genuinely different confidential
///         computation (a payroll raise decision) exposed as a pay-per-confidential-decision
///         c402 endpoint, attested and committed exactly like the treasury CDE.
///
///         Takes an encrypted remaining budget + an encrypted requested raise, evaluates an
///         encrypted policy cap entirely inside the Nox TEE using BRANCHLESS `Nox.select`
///         (so the outcome never leaks via reverts or gas), records a PUBLIC commitment, and
///         grants SELECTIVE decryption of the action to the payroll runtime only.
///
///         Confidentiality, not anonymity: addresses & calls are public; the values
///         (budget, requested raise, policy cap, action) stay encrypted.
contract PayrollCDE {
    // Plaintext action codes (the *mapping* is public; the *chosen* code is encrypted).
    uint256 internal constant ACTION_APPROVE = 0;
    uint256 internal constant ACTION_DEFER = 1;
    uint256 internal constant ACTION_REJECT = 2;

    // Coarse public confidence buckets (do not leak raw inputs).
    uint256 internal constant CONF_STRONG = 100;
    uint256 internal constant CONF_MEDIUM = 60;
    uint256 internal constant CONF_LOW = 20;

    address public owner;
    DecisionRegistry public immutable registry;
    /// @notice The only address permitted to decrypt decision actions.
    address public payrollRuntime;

    // Encrypted policy state (set by owner): the max single raise permitted by policy.
    euint256 private _raiseCap;
    bool public policyInitialized;

    uint256 public decisionCount;
    mapping(uint256 => euint256) public actionOf; // ACL-gated: payrollRuntime only
    mapping(uint256 => euint256) public confidenceOf; // publicly decryptable

    event PolicyUpdated(address indexed by);
    event PayrollRuntimeUpdated(address indexed runtime);
    event DecisionCommitted(uint256 indexed id, bytes32 commitment, address indexed caller);

    error NotOwner();
    error PolicyNotSet();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(DecisionRegistry registry_, address payrollRuntime_) {
        owner = msg.sender;
        registry = registry_;
        payrollRuntime = payrollRuntime_;

        // Encrypted state MUST be explicitly initialized; keep persistent access.
        _raiseCap = Nox.toEuint256(0);
        Nox.allowThis(_raiseCap);
    }

    function setPayrollRuntime(address runtime) external onlyOwner {
        payrollRuntime = runtime;
        emit PayrollRuntimeUpdated(runtime);
    }

    /// @notice Owner sets the encrypted policy cap (max single raise) from an external input.
    function setPolicy(externalEuint256 raiseCapExt, bytes calldata raiseCapProof) external onlyOwner {
        _raiseCap = Nox.fromExternal(raiseCapExt, raiseCapProof);
        Nox.allowThis(_raiseCap); // used in a later decide() tx → must persist
        Nox.allow(_raiseCap, owner);
        policyInitialized = true;
        emit PolicyUpdated(msg.sender);
    }

    /// @notice Submit encrypted remaining budget + encrypted requested raise; returns a decisionId.
    ///         Policy: requested < budget AND requested < cap -> APPROVE (conf 100)
    ///                 else requested < budget                -> DEFER   (conf 60)
    ///                 else                                    -> REJECT  (conf 20)
    ///         Evaluated branchlessly so the outcome is not observable on-chain.
    function decide(
        externalEuint256 budgetExt,
        bytes calldata budgetProof,
        externalEuint256 requestedExt,
        bytes calldata requestedProof
    ) external returns (uint256 id) {
        if (!policyInitialized) revert PolicyNotSet();

        euint256 budget = Nox.fromExternal(budgetExt, budgetProof);
        euint256 requested = Nox.fromExternal(requestedExt, requestedProof);

        ebool affordable = Nox.gt(budget, requested); // budget > requested
        ebool withinPolicy = Nox.gt(_raiseCap, requested); // cap > requested

        // action = affordable ? (withinPolicy ? APPROVE : DEFER) : REJECT
        euint256 affordableBranch = Nox.select(
            withinPolicy,
            Nox.toEuint256(ACTION_APPROVE),
            Nox.toEuint256(ACTION_DEFER)
        );
        euint256 action = Nox.select(affordable, affordableBranch, Nox.toEuint256(ACTION_REJECT));

        // confidence = affordable ? (withinPolicy ? 100 : 60) : 20
        euint256 confAffordable = Nox.select(
            withinPolicy,
            Nox.toEuint256(CONF_STRONG),
            Nox.toEuint256(CONF_MEDIUM)
        );
        euint256 confidence = Nox.select(affordable, confAffordable, Nox.toEuint256(CONF_LOW));

        id = ++decisionCount;

        // Selective decryption: contract keeps access; only the runtime can decrypt.
        actionOf[id] = action;
        Nox.allowThis(action);
        Nox.allow(action, payrollRuntime);

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
}
