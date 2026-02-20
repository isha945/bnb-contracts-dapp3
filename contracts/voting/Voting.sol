// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title  Voting
 * @notice A simple on-chain voting contract.
 *
 * HOW IT WORKS:
 *  1. Owner deploys with a list of candidate names.
 *  2. Owner opens voting via startVoting().
 *  3. Any address can cast exactly ONE vote for any candidate.
 *  4. Owner closes voting via endVoting().
 *  5. Anyone can call getWinner() to see the winner.
 *
 * DEPLOY ON REMIX:
 *  Constructor arg: ["Alice", "Bob", "Charlie"]  ← string array
 */
contract Voting {

    // ─── State ────────────────────────────────────────────────
    address public owner;
    bool    public votingOpen;

    struct Candidate {
        string  name;
        uint256 voteCount;
    }

    Candidate[] public candidates;
    mapping(address => bool) public hasVoted;

    // ─── Events ───────────────────────────────────────────────
    event VotingStarted();
    event VotingEnded();
    event Voted(address indexed voter, uint256 candidateIndex, string candidateName);

    // ─── Modifiers ────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenOpen() {
        require(votingOpen, "Voting is not open");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────
    constructor(string[] memory _candidateNames) {
        require(_candidateNames.length >= 2, "Need at least 2 candidates");
        owner = msg.sender;

        for (uint256 i = 0; i < _candidateNames.length; i++) {
            candidates.push(Candidate({
                name:      _candidateNames[i],
                voteCount: 0
            }));
        }
    }

    // ─── Owner Functions ──────────────────────────────────────

    function startVoting() external onlyOwner {
        require(!votingOpen, "Already open");
        votingOpen = true;
        emit VotingStarted();
    }

    function endVoting() external onlyOwner whenOpen {
        votingOpen = false;
        emit VotingEnded();
    }

    // ─── Voter Functions ──────────────────────────────────────

    /**
     * @notice Cast your vote for a candidate by their index.
     * @param candidateIndex Index from getCandidates() list (0-based)
     */
    function vote(uint256 candidateIndex) external whenOpen {
        require(!hasVoted[msg.sender], "You already voted");
        require(candidateIndex < candidates.length, "Invalid candidate");

        hasVoted[msg.sender] = true;
        candidates[candidateIndex].voteCount++;

        emit Voted(msg.sender, candidateIndex, candidates[candidateIndex].name);
    }

    // ─── View Functions ───────────────────────────────────────

    /// @notice Returns all candidates with their vote counts.
    function getCandidates() external view returns (Candidate[] memory) {
        return candidates;
    }

    /// @notice Returns total number of votes cast.
    function totalVotes() external view returns (uint256 total) {
        for (uint256 i = 0; i < candidates.length; i++) {
            total += candidates[i].voteCount;
        }
    }

    /// @notice Returns the current winner (leading candidate).
    ///         If tied, returns the first one with highest votes.
    function getWinner() external view returns (string memory winnerName, uint256 winnerVotes) {
        require(candidates.length > 0, "No candidates");
        uint256 maxVotes = 0;
        uint256 winIdx   = 0;

        for (uint256 i = 0; i < candidates.length; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                winIdx   = i;
            }
        }

        return (candidates[winIdx].name, candidates[winIdx].voteCount);
    }
}
