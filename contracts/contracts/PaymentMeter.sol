// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Nox, euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/// @title PaymentMeter
/// @notice Confidential x402 usage metering. The self-hosted facilitator records each
///         settlement here as an ENCRYPTED amount, so the public sees only that a
///         settlement happened - never how much a given caller paid or how often.
///         Per-caller counts/totals and the grand total are Nox-encrypted and
///         decryptable ONLY by the meter owner (the CDE API operator).
contract PaymentMeter {
    address public owner;
    mapping(address => bool) public isRecorder; // e.g. the facilitator

    mapping(address => euint256) private _count; // encrypted per-payer decision count
    mapping(address => euint256) private _total; // encrypted per-payer total paid
    euint256 private _grandTotal; // encrypted total revenue

    event RecorderSet(address indexed recorder, bool allowed);
    // Public signal that a (confidential-amount) settlement was metered.
    event Metered(address indexed payer, address indexed recorder);

    error NotOwner();
    error NotRecorder();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        _grandTotal = Nox.toEuint256(0);
        Nox.allowThis(_grandTotal);
        Nox.allow(_grandTotal, owner);
    }

    function setRecorder(address recorder, bool allowed) external onlyOwner {
        isRecorder[recorder] = allowed;
        emit RecorderSet(recorder, allowed);
    }

    /// @notice Record a settlement's encrypted amount for `payer`. Called by the facilitator.
    function record(address payer, externalEuint256 amountExt, bytes calldata amountProof) external {
        if (!isRecorder[msg.sender]) revert NotRecorder();
        euint256 amount = Nox.fromExternal(amountExt, amountProof);

        euint256 c = _count[payer];
        if (!Nox.isInitialized(c)) c = Nox.toEuint256(0);
        c = Nox.add(c, Nox.toEuint256(1));
        _count[payer] = c;
        Nox.allowThis(c);
        Nox.allow(c, owner);

        euint256 t = _total[payer];
        if (!Nox.isInitialized(t)) t = Nox.toEuint256(0);
        t = Nox.add(t, amount);
        _total[payer] = t;
        Nox.allowThis(t);
        Nox.allow(t, owner);

        _grandTotal = Nox.add(_grandTotal, amount);
        Nox.allowThis(_grandTotal);
        Nox.allow(_grandTotal, owner);

        emit Metered(payer, msg.sender);
    }

    // Handle getters - the returned handles are ACL-gated to `owner` only.
    function countOf(address payer) external view returns (euint256) {
        return _count[payer];
    }

    function totalOf(address payer) external view returns (euint256) {
        return _total[payer];
    }

    function grandTotal() external view returns (euint256) {
        return _grandTotal;
    }
}
