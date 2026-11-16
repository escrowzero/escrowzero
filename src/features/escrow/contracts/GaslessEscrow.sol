// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title GaslessEscrow
/// @notice Escrow for Robinhood Chain (4663). The user signs. A sponsor wallet pays gas.
///         This is a new contract. It does not replace a RobinhoodL2Escrow that is already deployed.
///         Token locks, releases, and refunds can be gasless. ETH locks still come from the user,
///         because a signature cannot pull ETH out of a wallet.
///         A wallet with at least 1,000,000 $ZEC pays no platform fee. Everyone else pays 0.20%.
library EscrowHasher {
    struct HashInput {
        bytes32 typehash;
        address creator;
        address beneficiary;
        address token;
        uint256 amount;
        uint256 durationSeconds;
        bool milestone;
        bytes32 memoHash;
        uint256 nonce;
        uint256 deadline;
    }

    function createHash(HashInput memory input) external pure returns (bytes32) {
        return keccak256(
            abi.encode(
                input.typehash,
                input.creator,
                input.beneficiary,
                input.token,
                input.amount,
                input.durationSeconds,
                input.milestone,
                input.memoHash,
                input.nonce,
                input.deadline
            )
        );
    }
}

contract GaslessEscrow {
    enum Status {
        None,
        Pending,
        Released,
        Refunded
    }

    struct Deal {
        address creator;
        address beneficiary;
        address assetToken;
        uint256 amount;
        uint256 released;
        uint256 expiry;
        bool milestone;
        Status status;
        string memo;
    }

    uint256 private constant FEE_BPS = 20;
    uint256 private constant BPS = 10_000;
    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant CREATE_TYPEHASH = keccak256(
        "CreateEscrow(address creator,address beneficiary,address token,uint256 amount,uint256 duration,bool milestone,bytes32 memoHash,uint256 nonce,uint256 deadline)"
    );
    bytes32 private constant RELEASE_TYPEHASH =
        keccak256("Release(address creator,bytes32 dealId,uint256 amount,uint256 nonce,uint256 deadline)");
    bytes32 private constant REFUND_TYPEHASH =
        keccak256("Refund(address creator,bytes32 dealId,uint256 nonce,uint256 deadline)");

    uint256 private _locked = 1;
    address public owner;
    address public treasury;
    address public zec;
    uint256 public vipThreshold;
    uint256 public dealCount;
    bytes32 public immutable DOMAIN_SEPARATOR;
    mapping(address => uint256) public nonces;
    mapping(bytes32 => Deal) public deals;

    struct CreateWork {
        address creator;
        address beneficiary;
        address token;
        uint256 amount;
        uint256 durationSeconds;
        bool milestone;
        uint256 deadline;
        bytes32 memoHash;
    }

    CreateWork private work;

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
    event FeeTaken(bytes32 indexed dealId, address indexed payer, uint256 fee);

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
    error BadSignature();
    error Expired();
    error EthNotGasless();
    error NotOwner();

    modifier nonReentrant() {
        if (_locked != 1) revert Reentered();
        _locked = 2;
        _;
        _locked = 1;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address zecToken, address treasury_) {
        owner = msg.sender;
        treasury = treasury_ == address(0) ? msg.sender : treasury_;
        if (zecToken != address(0)) _setZec(zecToken);
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("ZERO ESCROW")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    function gaslessVersion() external pure returns (uint8) {
        return 1;
    }

    function setTreasury(address nextTreasury) external onlyOwner {
        if (nextTreasury == address(0) || nextTreasury == address(this)) revert BadBeneficiary();
        treasury = nextTreasury;
    }

    function setZec(address zecToken) external onlyOwner {
        _setZec(zecToken);
    }

    function isVip(address account) public view returns (bool) {
        if (zec == address(0) || vipThreshold == 0) return false;
        return _balanceOf(zec, account) >= vipThreshold;
    }

    function quoteFee(address account, uint256 amount) external view returns (uint256 fee, uint256 net, bool vip) {
        vip = isVip(account);
        fee = vip ? 0 : (amount * FEE_BPS) / BPS;
        net = amount - fee;
    }

    function createDeal(
        address beneficiary,
        address assetToken,
        uint256 amount,
        uint256 durationSeconds,
        bool milestone,
        string calldata memo
    ) external payable nonReentrant returns (bytes32 dealId) {
        work.creator = msg.sender;
        work.beneficiary = beneficiary;
        work.token = assetToken;
        work.amount = amount;
        work.durationSeconds = durationSeconds;
        work.milestone = milestone;
        dealId = _openFromWork(memo, true);
        delete work;
    }

    function createEscrowGasless(
        address creator,
        address beneficiary,
        address token,
        uint256 amount,
        uint256 durationSeconds,
        bool milestone,
        string calldata memo,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant returns (bytes32 dealId) {
        work.creator = creator;
        work.beneficiary = beneficiary;
        work.token = token;
        work.amount = amount;
        work.durationSeconds = durationSeconds;
        work.milestone = milestone;
        work.deadline = deadline;
        dealId = _finishGaslessCreate(memo, signature);
    }

    function _finishGaslessCreate(string calldata memo, bytes calldata signature) internal returns (bytes32 dealId) {
        if (work.token == address(0)) revert EthNotGasless();
        work.memoHash = keccak256(bytes(memo));
        _signWork(signature);
        dealId = _openFromWork(memo, false);
        delete work;
    }

    function _signWork(bytes calldata signature) internal {
        EscrowHasher.HashInput memory input;
        input.typehash = CREATE_TYPEHASH;
        input.creator = work.creator;
        input.beneficiary = work.beneficiary;
        input.token = work.token;
        input.amount = work.amount;
        input.durationSeconds = work.durationSeconds;
        input.milestone = work.milestone;
        input.memoHash = work.memoHash;
        input.nonce = nonces[work.creator];
        input.deadline = work.deadline;
        _useSignature(work.creator, EscrowHasher.createHash(input), work.deadline, signature);
    }

    function releaseFunds(bytes32 dealId) external nonReentrant {
        _release(dealId, msg.sender, 0);
    }

    function releasePartial(bytes32 dealId, uint256 amount) external nonReentrant {
        _release(dealId, msg.sender, amount);
    }

    function releaseGasless(bytes32 dealId, uint256 amount, uint256 deadline, bytes calldata signature)
        external
        nonReentrant
    {
        Deal storage deal = deals[dealId];
        if (deal.status != Status.Pending) revert NotPending();
        _useSignature(
            deal.creator,
            keccak256(abi.encode(RELEASE_TYPEHASH, deal.creator, dealId, amount, nonces[deal.creator], deadline)),
            deadline,
            signature
        );
        _release(dealId, deal.creator, amount);
    }

    function refundFunds(bytes32 dealId) external nonReentrant {
        _refund(dealId, msg.sender);
    }

    function refundGasless(bytes32 dealId, uint256 deadline, bytes calldata signature) external nonReentrant {
        Deal storage deal = deals[dealId];
        if (deal.status != Status.Pending) revert NotPending();
        _useSignature(
            deal.creator,
            keccak256(abi.encode(REFUND_TYPEHASH, deal.creator, dealId, nonces[deal.creator], deadline)),
            deadline,
            signature
        );
        _refund(dealId, deal.creator);
    }

    function getDeal(bytes32 dealId) external view returns (Deal memory) {
        return deals[dealId];
    }

    function _openFromWork(string calldata memo, bool pullValue) internal returns (bytes32 dealId) {
        uint256 net;
        uint256 expiry;
        {
            address creator = work.creator;
            address beneficiary = work.beneficiary;
            address assetToken = work.token;
            uint256 amount = work.amount;
            if (beneficiary == address(0) || beneficiary == address(this)) revert BadBeneficiary();
            if (amount == 0) revert BadAmount();

            uint256 fee = isVip(creator) ? 0 : (amount * FEE_BPS) / BPS;
            net = amount - fee;
            if (net == 0) revert BadAmount();

            if (assetToken == address(0)) {
                if (!pullValue || msg.value != amount) revert EthMismatch();
            } else {
                if (msg.value != 0) revert UnexpectedEth();
                _transferFrom(assetToken, creator, address(this), amount);
            }

            dealId = keccak256(abi.encode(creator, beneficiary, amount, block.timestamp, dealCount));
            expiry = block.timestamp + work.durationSeconds;
            Deal storage deal = deals[dealId];
            deal.creator = creator;
            deal.beneficiary = beneficiary;
            deal.assetToken = assetToken;
            deal.amount = net;
            deal.released = 0;
            deal.expiry = expiry;
            deal.milestone = work.milestone;
            deal.status = Status.Pending;
            deal.memo = memo;
            dealCount += 1;
            if (fee > 0) _pay(assetToken, treasury, fee);
            emit FeeTaken(dealId, creator, fee);
        }
        emit DealCreated(dealId, work.creator, work.beneficiary, work.token, net, expiry, work.milestone, memo);
    }

    function _release(bytes32 dealId, address actor, uint256 amount) internal {
        Deal storage deal = deals[dealId];
        if (deal.status != Status.Pending) revert NotPending();
        if (actor != deal.creator) revert NotCreator();

        uint256 payout;
        bool finalRelease;
        if (amount == 0) {
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
        } else {
            if (!deal.milestone) revert BadPartial();
            uint256 remainder = deal.amount - deal.released;
            if (amount > remainder) revert BadPartial();
            payout = amount;
            deal.released += amount;
            finalRelease = deal.released == deal.amount;
            if (finalRelease) deal.status = Status.Released;
        }

        _pay(deal.assetToken, deal.beneficiary, payout);
        emit DealReleased(dealId, deal.beneficiary, payout, finalRelease);
    }

    function _refund(bytes32 dealId, address actor) internal {
        Deal storage deal = deals[dealId];
        if (deal.status != Status.Pending) revert NotPending();
        if (actor != deal.creator && block.timestamp < deal.expiry) revert NotRefundable();

        uint256 remainder = deal.amount - deal.released;
        deal.status = Status.Refunded;
        if (remainder > 0) _pay(deal.assetToken, deal.creator, remainder);
        emit DealRefunded(dealId, deal.creator, remainder);
    }

    function _useSignature(address creator, bytes32 structHash, uint256 deadline, bytes calldata signature) internal {
        if (block.timestamp > deadline) revert Expired();
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        if (_recover(digest, signature) != creator) revert BadSignature();
        nonces[creator] += 1;
    }

    function _setZec(address zecToken) internal {
        if (zecToken == address(0)) revert BadBeneficiary();
        zec = zecToken;
        (bool ok, bytes memory data) = zecToken.staticcall(abi.encodeWithSelector(bytes4(keccak256("decimals()"))));
        uint8 decimals = ok && data.length >= 32 ? abi.decode(data, (uint8)) : 18;
        vipThreshold = 1_000_000 * (10 ** uint256(decimals));
    }

    function _recover(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) revert BadSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) revert BadSignature();
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) revert BadSignature();
        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert BadSignature();
        return signer;
    }

    function _balanceOf(address token, address account) internal view returns (uint256) {
        (bool ok, bytes memory data) =
            token.staticcall(abi.encodeWithSelector(bytes4(keccak256("balanceOf(address)")), account));
        if (!ok || data.length < 32) return 0;
        return abi.decode(data, (uint256));
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
        (bool ok, bytes memory data) =
            token.call(abi.encodeWithSelector(bytes4(keccak256("transfer(address,uint256)")), to, amount));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function _transferFrom(address token, address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(bytes4(keccak256("transferFrom(address,address,uint256)")), from, to, amount)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }
}
