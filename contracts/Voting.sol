// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Voting - basic blockchain voting contract (one voter, one vote)
contract Voting {
    struct Candidate {
        uint256 id;
        string name;
        string party;
        uint256 voteCount;
    }

    address public admin;
    uint256 public candidatesCount;
    uint256 public startTime;
    uint256 public endTime;

    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public isRegistered;
    mapping(address => bool) public hasVoted;

    event VoterRegistered(address voter);
    event Voted(address indexed voter, uint256 indexed candidateId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin allowed");
        _;
    }

    modifier votingOpen() {
        require(block.timestamp >= startTime && block.timestamp <= endTime, "Voting is not open");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function setElectionPeriod(uint256 _start, uint256 _end) external onlyAdmin {
        require(_end > _start, "Invalid period");
        startTime = _start;
        endTime = _end;
    }

    function addCandidate(string memory _name, string memory _party) external onlyAdmin {
        require(startTime == 0 || block.timestamp < startTime, "Election already started");
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, _party, 0);
    }

    function registerVoter(address _voter) external onlyAdmin {
        require(!isRegistered[_voter], "Already registered");
        isRegistered[_voter] = true;
        emit VoterRegistered(_voter);
    }

    function vote(uint256 _candidateId) external votingOpen {
        require(isRegistered[msg.sender], "Not a registered voter");
        require(!hasVoted[msg.sender], "You have already voted");
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate");

        hasVoted[msg.sender] = true;
        candidates[_candidateId].voteCount++;

        emit Voted(msg.sender, _candidateId);
    }

    function getWinner() external view returns (string memory name, uint256 votes) {
        require(block.timestamp > endTime && endTime != 0, "Election not ended");
        uint256 maxVotes = 0;
        uint256 winnerId = 0;
        for (uint256 i = 1; i <= candidatesCount; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                winnerId = i;
            }
        }
        require(winnerId != 0, "No votes cast");
        return (candidates[winnerId].name, maxVotes);
    }
}
