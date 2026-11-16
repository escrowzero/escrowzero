// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/// @title ZecVipPaymaster
/// @notice ERC-4337 v0.7 paymaster for Robinhood Chain (chain id 4663).
///         Sponsors gas only when the account holds at least `minBalance` of $ZEC.
///         This is not the escrow. RobinhoodL2Escrow stays the vault.
///         Gas is paid from the ETH this contract deposits on the EntryPoint.
interface IEntryPoint {
    function depositTo(address account) external payable;
    function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external;
    function addStake(uint32 unstakeDelaySec) external payable;
    function unlockStake() external;
    function withdrawStake(address payable withdrawAddress) external;
    function balanceOf(address account) external view returns (uint256);
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

contract ZecVipPaymaster {
    uint256 internal constant SIG_VALIDATION_FAILED = 1;
    address public constant ENTRY_POINT = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;

    IEntryPoint public immutable entryPoint;
    IERC20 public immutable zec;
    address public owner;
    uint256 public minBalance;

    error NotOwner();
    error NotEntryPoint();
    error BadToken();

    struct PackedUserOperation {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        bytes32 accountGasLimits;
        uint256 preVerificationGas;
        bytes32 gasFees;
        bytes paymasterAndData;
        bytes signature;
    }

    enum PostOpMode {
        opSucceeded,
        opReverted,
        postOpReverted
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyEntryPoint() {
        if (msg.sender != address(entryPoint)) revert NotEntryPoint();
        _;
    }

    constructor(address zecToken) {
        if (zecToken == address(0)) revert BadToken();
        entryPoint = IEntryPoint(ENTRY_POINT);
        zec = IERC20(zecToken);
        owner = msg.sender;
        minBalance = 1_000_000 * (10 ** zec.decimals());
    }

    receive() external payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    /// @notice Put ETH here. The EntryPoint spends this deposit on VIP gas.
    function deposit() external payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    function entryPointDeposit() external view returns (uint256) {
        return entryPoint.balanceOf(address(this));
    }

    function withdraw(address payable to, uint256 amount) external onlyOwner {
        entryPoint.withdrawTo(to, amount);
    }

    /// @notice Required by bundlers because validation reads the $ZEC token.
    ///         Example: addStake{value: 0.1 ether}(86400).
    function addStake(uint32 unstakeDelaySec) external payable onlyOwner {
        entryPoint.addStake{value: msg.value}(unstakeDelaySec);
    }

    function unlockStake() external onlyOwner {
        entryPoint.unlockStake();
    }

    function withdrawStake(address payable to) external onlyOwner {
        entryPoint.withdrawStake(to);
    }

    function transferOwnership(address nextOwner) external onlyOwner {
        if (nextOwner == address(0)) revert NotOwner();
        owner = nextOwner;
    }

    function setMinBalance(uint256 nextMinBalance) external onlyOwner {
        minBalance = nextMinBalance;
    }

    function isVip(address account) public view returns (bool) {
        return zec.balanceOf(account) >= minBalance;
    }

    function validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32,
        uint256
    ) external onlyEntryPoint returns (bytes memory context, uint256 validationData) {
        if (userOp.paymasterAndData.length < 52) return ("", SIG_VALIDATION_FAILED);
        address namedPaymaster = address(bytes20(userOp.paymasterAndData[0:20]));
        if (namedPaymaster != address(this)) return ("", SIG_VALIDATION_FAILED);
        if (!isVip(userOp.sender)) return ("", SIG_VALIDATION_FAILED);
        return ("", 0);
    }

    function postOp(PostOpMode, bytes calldata, uint256, uint256) external view onlyEntryPoint {}
}
