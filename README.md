# Blockchain-Based Voting System for Secure and Transparent Election Management

Mini Project - Blockchain (D2C)

**Group 1**

| Roll No | Name |
|---|---|
| 37 | Prem Ahuja |
| 39 | Kunal Alsinghani |
| 42 | Brahma Bathija |
| 44 | Dev Chandiramani |

## Overview
A decentralized voting application where votes are recorded as Ethereum transactions. A smart contract enforces
"one registered voter, one vote" within a fixed election window and counts votes automatically. Anyone can verify
results and transactions on a block explorer.

## Base technical paper
G. G. Dagher, P. B. Marella, M. Milojkovic, J. Mohler, "BroncoVote: Secure Voting System using Ethereum's Blockchain",
ICISSP 2018, pp. 96-107. DOI: 10.5220/0006609700960107

Implemented from the paper: Ethereum smart-contract voter administration, public auditable ballots, testnet deployment,
and a privacy-oriented extension (commit-reveal in `PrivateVoting.sol`). Paillier homomorphic tallying is described in the
report as an off-chain extension and is not implemented in the contracts.

## Contracts
| File | Purpose |
|---|---|
| `contracts/Voting.sol` | Basic voting: admin, voter whitelist, time window, one vote per voter, winner |
| `contracts/PrivateVoting.sol` | Commit-reveal voting: tally hidden until the reveal phase |

## Setup
```bash
npm install
npx hardhat compile
npx hardhat test
```

### Run locally
```bash
npx hardhat node                 # terminal 1
npm run deploy:local             # terminal 2 - prints contract addresses
```
Open `frontend/index.html` in a browser with MetaMask connected to `http://127.0.0.1:8545` (chain id 31337),
paste the `Voting` address and click **Connect wallet & load**.

### Deploy to Sepolia
1. Copy `.env.example` to `.env`, fill `SEPOLIA_RPC_URL` and a **test-only** `PRIVATE_KEY`.
2. `npm run deploy:sepolia`
3. Verify transactions at https://sepolia.etherscan.io

### Deploy with Remix (no setup)
Paste `contracts/Voting.sol` into https://remix.ethereum.org, compile with 0.8.20, choose
**Injected Provider - MetaMask** (Sepolia) and deploy.

## Tests
17 automated tests (10 for `Voting`, 7 for `PrivateVoting`) cover admin access control, registration, voting,
double-vote rejection, unregistered voters, time window, invalid candidate and winner selection.

## Gas (Hardhat local run)
| Operation | Gas |
|---|---|
| Deploy `Voting` | 1,427,234 |
| `registerVoter` | ~47,800 |
| `addCandidate` | ~111,900 (avg) |
| `setElectionPeriod` | ~68,500 |
| `vote` | ~73,200 (avg) |
| Deploy `PrivateVoting` | 1,898,740 |
| `commitVote` | ~50,000 |
| `revealVote` | ~70,800 (avg) |

## Security notes
- Admin-only functions use an `onlyAdmin` modifier; Solidity 0.8.x has built-in overflow checks.
- No personal data is stored on-chain; only wallet addresses and counts.
- Votes are pseudonymous, not anonymous. Commit-reveal hides the running tally, not the final vote-to-address mapping.
- Never commit a real private key; `.env` is git-ignored.

## License
MIT
