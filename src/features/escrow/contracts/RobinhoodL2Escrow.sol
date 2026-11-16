// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title RobinhoodL2Escrow
/// @notice Non-custodial escrow for ETH and ERC-20 tokens on Robinhood Chain (chain id 4663).
///         The payer locks funds. Only the payer can release them to the beneficiary.
///         The payer can refund any time. After expiry, anyone can refund what is left.
contract RobinhoodL2Escrow {
    enum Status {
        None,
        Pending,
        Released,
        Refunded
    }

    struct Deal {
        address creator;
        address beneficiary;
        address assetToken; // address(0) = native ETH
        uint256 amount;
        uint256 released;
        uint256 expiry;
        bool milestone;
        Status status;
        string memo;
    }

    uint256 private _locked = 1;
    uint256 public dealCount;
    mapping(bytes32 => Deal) public deals;

    event DealCreated(
        bytes32 indexed dealId,
        address indexed creator,
        address indexed beneficiary,
        address assetToken,
        uint256 amount,
        uint256 expiry,
        bool milestone,
        string memo
    );
    event DealReleased(bytes32 indexed dealId, address indexed to, uint256 amount, bool finalRelease);
    event DealRefunded(bytes32 indexed dealId, address indexed to, uint256 amount);

    error BadBeneficiary();
    error BadAmount();
    error EthMismatch();
    error UnexpectedEth();
    error UnknownDeal();
    error NotPending();
    error NotCreator();
    error NotRefundable();
    error TransferFailed();
    error Reentered();
    error BadPartial();

    modifier nonReentrant() {
        if (_locked != 1) revert Reentered();
        _locked = 2;
        _;
        _locked = 1;
    }

    function createDeal(
        address beneficiary,
        address assetToken,
        uint256 amount,
        uint256 durationSeconds,
        bool milestone,
        string calldata memo
    ) external payable nonReentrant returns (bytes32 dealId) {
        if (beneficiary == address(0)) revert BadBeneficiary();
        if (amount == 0) revert BadAmount();

        if (assetToken == address(0)) {
            if (msg.value != amount) revert EthMismatch();
        } else {
            if (msg.value != 0) revert UnexpectedEth();
            _transferFrom(assetToken, msg.sender, address(this), amount);
        }

        dealId = keccak256(abi.encode(msg.sender, beneficiary, amount, block.timestamp, dealCount));
        uint256 expiry = block.timestamp + durationSeconds;

        deals[dealId] = Deal({
            creator: msg.sender,
            beneficiary: beneficiary,
            assetToken: assetToken,
            amount: amount,
            released: 0,
            expiry: expiry,
            milestone: milestone,
            status: Status.Pending,
            memo: memo
        });
        dealCount += 1;

        emit DealCreated(dealId, msg.sender, beneficiary, assetToken, amount, expiry, milestone, memo);
    }

    /// @notice Creator releases funds. Without a milestone, this sends the full amount.
    ///         With a milestone, the first call sends half and the second call sends the rest.
    function releaseFunds(bytes32 dealId) external nonReentrant {
        Deal storage deal = deals[dealId];
        if (deal.status != Status.Pending) revert NotPending();
        if (msg.sender != deal.creator) revert NotCreator();

        uint256 payout;
        bool finalRelease;
        if (!deal.milestone || deal.released > 0) {
            payout = deal.amount - deal.released;
            finalRelease = true;
            deal.released = deal.amount;
            deal.status = Status.Released;
        } else {
            payout = deal.amount / 2;
            if (payout == 0) payout = deal.amount;
            deal.released = payout;
            finalRelease = payout == deal.amount;
            if (finalRelease) deal.status = Status.Released;
        }

        _pay(deal.assetToken, deal.beneficiary, payout);
        emit DealReleased(dealId, deal.beneficiary, payout, finalRelease);
    }

    /// @notice Creator releases a chosen amount while a milestone deal is still open.
    ///         The rest stays locked until another partial payment, a full release, or a refund.
    function releasePartial(bytes32 dealId, uint256 amount) external nonReentrant {
        Deal storage deal = deals[dealId];
        if (deal.status != Status.Pending) revert NotPending();
        if (msg.sender != deal.creator) revert NotCreator();
        if (!deal.milestone) revert BadPartial();
        uint256 remainder = deal.amount - deal.released;
        if (amount == 0 || amount > remainder) revert BadPartial();

        deal.released += amount;
        bool finalRelease = deal.released == deal.amount;
        if (finalRelease) deal.status = Status.Released;

        _pay(deal.assetToken, deal.beneficiary, amount);
        emit DealReleased(dealId, deal.beneficiary, amount, finalRelease);
    }

    /// @notice Creator can refund the remainder at any time.
    ///         After expiry, anyone can refund the remainder to the creator.
    function refundFunds(bytes32 dealId) external nonReentrant {
        Deal storage deal = deals[dealId];
        if (deal.status != Status.Pending) revert NotPending();
        if (msg.sender != deal.creator && block.timestamp < deal.expiry) revert NotRefundable();

        uint256 remainder = deal.amount - deal.released;
        deal.status = Status.Refunded;
        if (remainder > 0) _pay(deal.assetToken, deal.creator, remainder);
        emit DealRefunded(dealId, deal.creator, remainder);
    }

    function getDeal(bytes32 dealId) external view returns (Deal memory) {
        return deals[dealId];
    }

    function _pay(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (token == address(0)) {
            (bool ok,) = to.call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            _transfer(token, to, amount);
        }
    }

    function _transfer(address token, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(bytes4(keccak256("transfer(address,uint256)")), to, amount));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function _transferFrom(address token, address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) =
            token.call(abi.encodeWithSelector(bytes4(keccak256("transferFrom(address,address,uint256)")), from, to, amount));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }
}
