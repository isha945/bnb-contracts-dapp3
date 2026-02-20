// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title  SimpleAuction
 * @notice A straightforward open English auction for any item.
 *
 * HOW IT WORKS:
 *  1. Owner deploys with an item name and duration (in seconds).
 *  2. Bidders send ETH to placeBid() - must exceed current highest bid.
 *  3. Outbid users can withdraw their ETH at any time.
 *  4. After the auction ends, winner is whoever holds the highest bid.
 *  5. Owner calls withdrawProceeds() to collect the winning ETH.
 */
contract SimpleAuction {

    // ─── State ────────────────────────────────────────────────
    address public owner;
    string  public itemName;
    uint256 public endTime;
    bool    public ended;

    address public highestBidder;
    uint256 public highestBid;

    // Tracks how much each outbid address can withdraw
    mapping(address => uint256) public pendingReturns;

    // ─── Events ───────────────────────────────────────────────
    event NewHighestBid(address indexed bidder, uint256 amount);
    event BidWithdrawn(address indexed bidder, uint256 amount);
    event AuctionEnded(address indexed winner, uint256 amount);

    // ─── Modifiers ────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier auctionActive() {
        require(block.timestamp < endTime, "Auction has ended");
        require(!ended, "Auction already closed");
        _;
    }

    modifier auctionOver() {
        require(block.timestamp >= endTime || ended, "Auction still active");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────
    constructor(string memory _itemName, uint256 _duration) {
        require(_duration > 0, "Duration must be > 0");
        owner    = msg.sender;
        itemName = _itemName;
        endTime  = block.timestamp + _duration;
    }

    // ─── Bidder Functions ─────────────────────────────────────

    function placeBid() external payable auctionActive {
        require(msg.value > highestBid, "Bid too low - must exceed current highest bid");

        if (highestBidder != address(0)) {
            pendingReturns[highestBidder] += highestBid;
        }

        highestBidder = msg.sender;
        highestBid    = msg.value;

        emit NewHighestBid(msg.sender, msg.value);
    }

    function withdraw() external {
        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        pendingReturns[msg.sender] = 0;

        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "Transfer failed");

        emit BidWithdrawn(msg.sender, amount);
    }

    // ─── Owner Functions ──────────────────────────────────────

    function withdrawProceeds() external onlyOwner auctionOver {
        require(!ended, "Already withdrawn");
        ended = true;

        uint256 amount = highestBid;
        highestBid = 0;

        emit AuctionEnded(highestBidder, amount);

        (bool ok,) = payable(owner).call{value: amount}("");
        require(ok, "Transfer failed");
    }

    function endEarly() external onlyOwner auctionActive {
        endTime = block.timestamp;
    }

    // ─── View Functions ───────────────────────────────────────

    function timeLeft() external view returns (uint256) {
        if (block.timestamp >= endTime) return 0;
        return endTime - block.timestamp;
    }

    function getStatus() external view returns (
        string memory item,
        address leader,
        uint256 leadingBid,
        uint256 secondsLeft,
        bool    isEnded
    ) {
        uint256 left = block.timestamp >= endTime ? 0 : endTime - block.timestamp;
        return (itemName, highestBidder, highestBid, left, ended || block.timestamp >= endTime);
    }
}
