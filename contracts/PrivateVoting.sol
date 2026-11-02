// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PrivateVoting - commit-reveal voting (hides the running tally until the reveal phase)
/// Inspired by the privacy goal of BroncoVote (Dagher et al., ICISSP 2018).
contract PrivateVoting {
    enum Phase { Setup, Commit, Reveal, Ended }

    struct Candidate {
        string name;
        uint256 voteCount;
    }

    address public admin;
    Phase public phase;
    Candidate[] public candidates;

    mapping(address => bool) public isRegistered;
    mapping(address => bytes32) public commitments;
    mapping(address => bool) public hasRevealed;

    event VoterRegistered(address voter);
    event VoteCommitted(address indexed voter);
    event VoteRevealed(address indexed voter, uint256 candidateId);
    event PhaseChanged(Phase newPhase);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier inPhase(Phase p) {
        require(phase == p, "Wrong phase");
        _;
    }

    constructor() {
        admin = msg.sender;
        phase = Phase.Setup;
    }

    function candidatesCount() external view returns (uint256) {
        return candidates.length;
    }

    function addCandidate(string memory _name) external onlyAdmin inPhase(Phase.Setup) {
        candidates.push(Candidate(_name, 0));
    }

    function registerVoter(address _voter) external onlyAdmin inPhase(Phase.Setup) {
        isRegistered[_voter] = true;
        emit VoterRegistered(_voter);
    }

    function startCommitPhase() external onlyAdmin inPhase(Phase.Setup) {
        require(candidates.length >= 2, "Need at least 2 candidates");
        phase = Phase.Commit;
        emit PhaseChanged(phase);
    }

    function startRevealPhase() external onlyAdmin inPhase(Phase.Commit) {
        phase = Phase.Reveal;
        emit PhaseChanged(phase);
    }

    function endElection() external onlyAdmin inPhase(Phase.Reveal) {
        phase = Phase.Ended;
        emit PhaseChanged(phase);
    }

    /// commitment = keccak256(abi.encodePacked(candidateId, salt, voterAddress))
    function commitVote(bytes32 _commitment) external inPhase(Phase.Commit) {
        require(isRegistered[msg.sender], "Not registered");
        require(commitments[msg.sender] == bytes32(0), "Already committed");
        require(_commitment != bytes32(0), "Empty commitment");
        commitments[msg.sender] = _commitment;
        emit VoteCommitted(msg.sender);
    }

    function revealVote(uint256 _candidateId, bytes32 _salt) external inPhase(Phase.Reveal) {
        require(commitments[msg.sender] != bytes32(0), "No commitment");
        require(!hasRevealed[msg.sender], "Already revealed");
        require(_candidateId < candidates.length, "Invalid candidate");
        require(
            keccak256(abi.encodePacked(_candidateId, _salt, msg.sender)) == commitments[msg.sender],
            "Hash mismatch"
        );

        hasRevealed[msg.sender] = true;
        candidates[_candidateId].voteCount++;
        emit VoteRevealed(msg.sender, _candidateId);
    }

    function getWinner() external view inPhase(Phase.Ended) returns (string memory name, uint256 votes) {
        uint256 best = 0;
        uint256 bestId = 0;
        for (uint256 i = 0; i < candidates.length; i++) {
            if (candidates[i].voteCount > best) {
                best = candidates[i].voteCount;
                bestId = i;
            }
        }
        return (candidates[bestId].name, best);
    }
}
