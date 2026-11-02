# Blockchain-Based Voting System for Secure and Transparent Election Management

**Mini Project, Blockchain (D2C), Group 1**

| Roll No | Name |
|---|---|
| 37 | Prem Ahuja |
| 39 | Kunal Alsinghani |
| 42 | Brahma Bathija |
| 44 | Dev Chandiramani |

This document explains, in detail, what was built, why each decision was made, how it works, how it was tested, and how to run it.

---

## 1. Problem and Motivation

Traditional voting (paper ballots, EVMs, central web voting) depends on a single authority that stores and counts the votes. If that authority, its database or its machines are compromised, voters cannot independently prove their vote was recorded or counted correctly. Problems include vote tampering, duplicate voting, lack of transparency and slow counting.

**Goal:** build a voting system where the votes live on a blockchain, so that:

- no single party can silently change the data,
- the rules (one registered voter, one vote, fixed time window) are enforced by code,
- anyone can verify the result and each transaction.

## 2. Why Blockchain

| Election requirement | How blockchain helps |
|---|---|
| Integrity | Blocks are linked by hashes; changing one record breaks the chain |
| Transparency | Transactions and contract code are public |
| No single point of trust | Data is replicated across many nodes |
| Eligibility and one-vote rule | Enforced by smart contract logic |
| Auditability | Each vote returns a transaction hash usable as a receipt |

## 3. What We Delivered

| Deliverable | File | Purpose |
|---|---|---|
| Report | Claude Doc "Blockchain-Based Voting System - Mini Project Documentation" | Full project report (24 sections) |
| Source code repo | `blockchain-voting.zip` | Contracts, tests, deploy script, front end, README |
| Presentation | `Blockchain_Voting_Presentation.pptx` | 14-slide final presentation |
| Cook Book | Claude Doc "Cook Book - Blockchain-Based Voting System" | Step-by-step guide to reproduce and demo |
| Technical paper | BroncoVote (ICISSP 2018) | Base paper that we studied and implemented |
| This file | `PROJECT_EXPLANATION.md` | Detailed explanation of everything |

## 4. Base Technical Paper

**G. G. Dagher, P. B. Marella, M. Milojkovic, J. Mohler, "BroncoVote: Secure Voting System using Ethereum's Blockchain," ICISSP 2018, pp. 96-107. DOI 10.5220/0006609700960107.**
Link: https://www.scitepress.org/Papers/2018/66097/66097.pdf

The paper proposes a university-scale voting framework on Ethereum. Smart contracts handle voter administration and keep an auditable public record. For privacy, ballots are encrypted using the Paillier homomorphic cryptosystem so votes can be tallied without decrypting individual ballots. The system was deployed on an Ethereum test network.

**Why we chose it:** it uses the same stack as ours (Ethereum, Solidity, testnet) and addresses the main weakness of a basic blockchain voting system, which is voter privacy.

**Paper-to-project mapping**

| Idea in the paper | What we implemented |
|---|---|
| Smart contracts for voter administration | Admin-controlled voter whitelist in `Voting.sol` |
| Public, auditable ballots | `Voted` events and public tallies, checkable on Etherscan |
| Privacy-preserving ballots | Commit-reveal in `PrivateVoting.sol` |
| Testnet deployment | Remix + MetaMask + Sepolia procedure |
| Cost and usability evaluation | Gas measurements and 17 automated tests |

**Honest note:** the paper uses Paillier homomorphic encryption. We did **not** implement Paillier in the contracts, because that arithmetic is too expensive on-chain. Instead we implemented commit-reveal, which achieves a smaller goal (hiding the running tally during voting). The Paillier approach is documented as an off-chain extension in the report.

## 5. System Architecture

Three layers:

1. **Presentation layer:** a single-page HTML/JavaScript front end using Ethers.js. It talks to the blockchain through the MetaMask wallet, which signs every transaction.
2. **Smart contract layer:** `Voting.sol` and `PrivateVoting.sol`, which hold all election logic and state.
3. **Blockchain network layer:** Ethereum. We use a local Hardhat node for development and the Sepolia test network for the demo.

**Actors**

- **Admin:** deploys the contract, adds candidates, registers voters, sets the voting window.
- **Voter:** connects a wallet, casts one vote.
- **Auditor / public:** reads results and verifies transactions.

**Workflow**

1. Admin deploys the contract.
2. Admin adds candidates, registers voters and sets the start and end time.
3. Voter connects MetaMask.
4. Voter calls `vote(candidateId)`; MetaMask asks for confirmation.
5. The contract checks the rules and either records the vote or reverts.
6. The transaction is mined; the voter gets a transaction hash.
7. After the end time, `getWinner()` returns the result.

## 6. The Smart Contracts Explained

### 6.1 `Voting.sol` (basic voting)

**State variables**

| Variable | Meaning |
|---|---|
| `admin` | Address that deployed the contract; only it can run setup functions |
| `candidatesCount` | Number of candidates; also used as the next candidate id (ids start at 1) |
| `startTime`, `endTime` | Unix timestamps of the voting window |
| `candidates` | Mapping from id to `Candidate{id, name, party, voteCount}` |
| `isRegistered` | Whitelist of eligible voters |
| `hasVoted` | Tracks who has already voted |

**Modifiers**

- `onlyAdmin`: reverts with "Only admin allowed" if the caller is not the admin.
- `votingOpen`: reverts with "Voting is not open" unless `block.timestamp` is inside the window.

**Functions**

- `setElectionPeriod(start, end)`: admin only; requires `end > start`.
- `addCandidate(name, party)`: admin only; allowed only before the election starts, so candidates cannot be added mid-election.
- `registerVoter(address)`: admin only; rejects duplicates; emits `VoterRegistered`.
- `vote(candidateId)`: the core function. It checks, in order: voting is open, caller is registered, caller has not voted, candidate id is valid. Then it sets `hasVoted[msg.sender] = true`, increments the candidate's `voteCount`, and emits `Voted`. Marking `hasVoted` before any other effect is what prevents double voting.
- `getWinner()`: public view; reverts until the election has ended; loops through candidates to find the highest count; reverts with "No votes cast" if nobody voted.

**Events:** `VoterRegistered(address)` and `Voted(address indexed voter, uint indexed candidateId)`. Events are cheap to store and easy to search on a block explorer, which supports auditing.

### 6.2 `PrivateVoting.sol` (commit-reveal extension)

In the basic contract, the running tally is visible while voting is still open, which can influence later voters. Commit-reveal fixes this.

**Phases:** `Setup` then `Commit` then `Reveal` then `Ended`, advanced only by the admin.

1. **Setup:** admin adds at least two candidates and registers voters.
2. **Commit:** each voter submits `keccak256(candidateId, salt, voterAddress)`. Only the hash is stored, so nobody can see the choice. The tally stays at zero.
3. **Reveal:** each voter submits `candidateId` and the secret `salt`. The contract recomputes the hash; if it matches the stored commitment, the vote is counted. Including the voter address in the hash stops one voter reusing another's commitment.
4. **Ended:** `getWinner()` becomes available.

**Limitation:** after reveal, votes are public and linked to wallet addresses. Commit-reveal therefore gives fairness during voting, not full ballot secrecy.

## 7. Front End (`frontend/index.html`)

A single HTML file with no build step. It loads Ethers.js v6 from a CDN and contains a human-readable ABI of `Voting.sol`.

- **Connect:** requests MetaMask accounts, creates a contract object from the pasted address, and shows whether the connected account is the admin.
- **Candidates list:** reads `candidatesCount` and `candidates(i)`, shows vote counts, and shows a Vote button (disabled if the account has already voted).
- **Admin panel:** forms to add candidates, register voters and set the election period, plus a helper that fills start = now + 1 minute and end = now + 1 hour.
- **Transaction feedback:** the status bar shows the transaction hash and revert reasons such as "You have already voted".
- **Winner button:** calls `getWinner()`.

## 8. Tooling and Project Structure

```
blockchain-voting/
  contracts/   Voting.sol, PrivateVoting.sol
  scripts/     deploy.js
  test/        voting.test.js, privatevoting.test.js
  frontend/    index.html
  hardhat.config.js, package.json, .env.example, .gitignore, README.md
```

| Tool | Role |
|---|---|
| Solidity 0.8.20 | Contract language; built-in overflow checks |
| Hardhat | Compile, test, run a local chain, deploy |
| Mocha + Chai (via Hardhat Toolbox) | Test framework and assertions |
| Ethers.js v6 | Contract calls from tests, scripts and front end |
| MetaMask | Wallet that signs transactions |
| Remix IDE | Browser-based compile and deploy for the demo |
| Sepolia + Etherscan | Public test network and transaction verification |

`hardhat.config.js` adds a Sepolia network automatically only when `SEPOLIA_RPC_URL` and `PRIVATE_KEY` exist in `.env`, so the project works locally without any secrets. `.env` is git-ignored.

## 9. Testing

We wrote 17 automated tests and ran all of them: **17 passing**.

**`Voting` (10 tests)**

| ID | Scenario | Expected |
|---|---|---|
| TC1 | Admin adds candidate | Count becomes 2 |
| TC2 | Non-admin adds candidate | Reverts: Only admin allowed |
| TC3 | Admin registers voter | Voter whitelisted |
| TC4 | Registered voter votes | Event emitted, count +1 |
| TC5 | Voter votes twice | Reverts: You have already voted |
| TC6 | Unregistered voter | Reverts: Not a registered voter |
| TC7 | Vote before start | Reverts: Voting is not open |
| TC8 | Vote after end | Reverts: Voting is not open |
| TC9 | Candidate id 0 or too high | Reverts: Invalid candidate |
| TC10 | Winner before and after end | Reverts early; correct winner later |

Time-dependent tests use Hardhat's `time.increase` to move the blockchain clock instead of waiting.

**`PrivateVoting` (7 tests)**

| ID | Scenario | Expected |
|---|---|---|
| P1 | Commit during commit phase | Stored; tally unchanged |
| P2 | Reveal during commit phase | Reverts: Wrong phase |
| P3 | Wrong salt or wrong candidate | Reverts: Hash mismatch |
| P4 | Reveal twice | Reverts: Already revealed |
| P5 | Commit twice | Reverts: Already committed |
| P6 | Unregistered commit | Reverts: Not registered |
| P7 | Full flow and winner | Correct winner after end |

**How we ran the tests:** in our build environment the Solidity compiler binary could not be downloaded, so we compiled with the JavaScript build of the compiler (`solc` 0.8.20 from npm) through a small override in a scratch copy of the project. Contracts, tests and results are identical; the override is not part of the delivered repo. On your own machine, normal `npx hardhat test` downloads the compiler automatically.

**Not done here:** deployment to Sepolia and testing the browser front end with a real MetaMask were not performed in our build environment. You need to do these during your demo.

## 10. Gas Measurements (local Hardhat run)

| Operation | Gas |
|---|---|
| Deploy `Voting` | 1,427,234 |
| `registerVoter` | about 47,800 |
| `setElectionPeriod` | about 68,500 |
| `addCandidate` | about 111,900 (average) |
| `vote` | about 73,200 (average) |
| Deploy `PrivateVoting` | 1,898,740 |
| `commitVote` | about 50,000 |
| `revealVote` | about 70,800 (average) |

Writing to storage is the main cost. Sepolia values may differ slightly. Record your own from Etherscan.

## 11. Security Analysis

| Threat | Mitigation |
|---|---|
| Double voting | `hasVoted` mapping set on first vote |
| Unauthorized voting | Whitelist via `registerVoter`; tested |
| Admin abuse | Admin can set up the election but cannot edit tallies or cast votes; all actions are public |
| Tampering | Immutable, hash-linked ledger |
| Late or early votes | `votingOpen` time-window modifier |
| Integer overflow | Solidity 0.8.x built-in checks |
| Privacy leakage | No personal data on-chain; commit-reveal hides interim tally |
| Key leakage | `.env` git-ignored; use test wallets only |

**Known limitations**

- Voters are pseudonymous, not anonymous; a wallet address can sometimes be linked to a person.
- The admin decides who is registered, so identity verification is a trust point (done off-chain in this prototype).
- Gas costs and throughput limits of public chains.
- The prototype has not been security-audited or scaled to a real election.

## 12. How to Run (bash)

```bash
node -v && npm -v              # need Node.js 18 or newer
unzip blockchain-voting.zip
cd blockchain-voting
npm install
npx hardhat compile
npx hardhat test               # expect 17 passing
REPORT_GAS=true npx hardhat test   # optional gas report
```

Local chain with front end (two terminals):

```bash
npx hardhat node               # terminal 1, keep running
npm run deploy:local           # terminal 2, prints contract addresses
start frontend/index.html      # Git Bash on Windows (xdg-open on Linux, open on macOS)
```

MetaMask network: RPC `http://127.0.0.1:8545`, chain ID `31337`. Import a test key shown by `hardhat node`. Paste the `Voting` address into the page and click "Connect wallet & load".

Sepolia deployment:

```bash
cp .env.example .env           # fill SEPOLIA_RPC_URL and a test-only PRIVATE_KEY
npm run deploy:sepolia
```

Or use Remix: paste `contracts/Voting.sol`, compile with 0.8.20, choose "Injected Provider - MetaMask" on Sepolia, deploy.

## 13. Requirement Coverage

| Mini project requirement | Where it is covered |
|---|---|
| Real-world problem, objectives, solution, blockchain benefits | Sections 1, 2 here; report sections 2, 3, 6, 21 |
| System architecture | Section 5 here; report sections 8 to 10 |
| Working prototype (Ethereum, Solidity, Remix, MetaMask) | Sections 6, 7, 8 here; repo; report section 22 |
| Demonstrate and test deployment, execution, validation, verification | Sections 9, 12 here; Cook Book; report sections 13, 22 |
| Submission: architecture, implementation, test results, security, source code, presentation | Repo, PPT, Sections 9 to 11 here |
| Technical paper and implementation | Section 4 here; report section 24 |

## 14. Likely Viva Questions

1. **Why blockchain instead of a database?** No single party controls or can silently alter the records, and results are publicly verifiable.
2. **How do you prevent double voting?** The `hasVoted` mapping is set during the first successful vote, and later attempts revert.
3. **Is the vote anonymous?** No, it is pseudonymous. Votes link to wallet addresses. Full anonymity needs blind signatures, mixnets or zero-knowledge proofs.
4. **What does commit-reveal add?** It hides the running tally until the reveal phase, so early results cannot influence later voters.
5. **What did you take from the paper and what did you not implement?** Contract-based voter administration, public auditable ballots and testnet deployment. We did not implement Paillier encryption on-chain; it is described as an off-chain extension.
6. **Who can cheat?** The admin controls voter registration, so identity verification is a trust assumption. The admin cannot change tallies or vote.
7. **Why a testnet?** It uses free test ETH and has the same behavior as the main network, so it is safe for a demo.
8. **What happens to a failed transaction?** It reverts, state is unchanged, and the sender only pays gas for the attempt.

## 15. Before You Submit (checklist)

- [ ] Fill names, guide and college in the report placeholders
- [ ] Deploy to Sepolia and record contract address and transaction hashes
- [ ] Take screenshots (deployment, votes, rejected cases, Etherscan, test output)
- [ ] Update the report's test table to 17 tests
- [ ] Push the repo to GitHub and paste the link in the grading sheet
- [ ] Upload the PPT to Drive; share the Cook Book link
- [ ] Paste the paper link: https://www.scitepress.org/Papers/2018/66097/66097.pdf
- [ ] Confirm with your library that the paper's venue satisfies the "Scopus indexed" requirement

---

## 16. Step-by-Step Demo Guide (Local Hardhat + MetaMask + Web Front End)

This section records the exact procedure we followed to run the election on a local blockchain, including the problems we met and their fixes.

### 16.1 Start the local blockchain and deploy

Terminal 1 (leave running):

```bash
cd /d/college/sem\ 6/Blockchain/blockchain-voting
npx hardhat node
```

Terminal 2:

```bash
cd /d/college/sem\ 6/Blockchain/blockchain-voting
npm run deploy:local
```

Example output (your addresses will be the same on a fresh node):

```
Deploying with account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Voting deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
PrivateVoting deployed at: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

Use the **Voting** address in the front end. The `PrivateVoting` address will not work with the page.

### 16.2 Hardhat accounts and their roles

| Hardhat account | Address | Role | MetaMask name |
|---|---|---|---|
| #0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Admin (deployed the contract) | Admin |
| #1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | Registered voter | Voter1 |
| #2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | Registered voter | Voter2 |
| #3 | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | Left unregistered on purpose | Voter3 |

These accounts and their private keys are public test accounts printed by `npx hardhat node`. Use them only on the local network. Never send real funds to them on a live network.

### 16.3 Set up MetaMask

1. Install the MetaMask extension in the browser you will use for the demo.
2. Add a custom network:
   - Network name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency symbol: `ETH`
3. Switch to the **Hardhat Local** network.
4. Open the account menu, choose **Add account or hardware wallet**, then **Import account**. Paste the private key of Account #0 from the `hardhat node` output and rename the account **Admin**.
5. Repeat for Account #1, #2 and #3 and rename them **Voter1**, **Voter2** and **Voter3**.
6. Each imported account should show about 10,000 ETH. If it shows 0, you are on the wrong network.
7. To switch accounts later, click the account name at the top of MetaMask and select another account from the list.

### 16.4 Open the front end through localhost

Opening `frontend/index.html` directly from disk (address starting with `file:///`) shows "MetaMask not found", because Chrome does not inject MetaMask into local files by default. Serve the folder instead. In a third terminal:

```bash
cd /d/college/sem\ 6/Blockchain/blockchain-voting
npx http-server frontend -p 8000
```

(Alternative: `cd frontend && python -m http.server 8000`.)

Open `http://localhost:8000` in the browser that has MetaMask installed.

### 16.5 Connect as Admin

1. In MetaMask, select **Admin** on the **Hardhat Local** network.
2. Paste the **Voting** address into the page and click **Connect wallet & load**.
3. In the MetaMask popup, tick **Admin** and click **Connect**. If the status bar says "Waiting for MetaMask confirmation...", open the MetaMask icon in the toolbar and approve the pending request.
4. The status bar should read `Connected as 0xf39F... (ADMIN)`.

### 16.6 Set up the election (as Admin)

Confirm every action in the MetaMask popup. Wait for the transaction hash to appear in the status bar before the next action.

1. **Add candidates:** enter a name and party, click **Add candidate**. Repeat for a second candidate.
2. **Register voters:** paste the Voter1 address, click **Register voter**. Repeat for Voter2. Do not register Voter3.
3. **Set the voting window:** click **Fill: start in 1 min, end in 1 hour**, then **Set election period**.

Add all candidates before the start time passes. The contract rejects new candidates once the election has started.

### 16.7 Cast votes

1. Wait about one minute for the start time to pass.
2. Switch MetaMask to **Voter1**. On the page, click **Connect wallet & load** and approve Voter1. The status bar should say `(voter)`.
3. Click **Vote** next to a candidate and confirm. The status bar shows the transaction hash and the candidate's count becomes 1.
4. Switch to **Voter2**, reconnect, and vote.

### 16.8 Show the rejection cases (for the report and viva)

| Test | How | Expected message |
|---|---|---|
| Double vote | Voter1 tries to vote again | You have already voted (button also disabled) |
| Unregistered voter | Switch to Voter3, reconnect, vote | Not a registered voter |
| Non-admin action | As Voter1, try adding a candidate | Only admin allowed |
| Vote outside window | Vote before start or after end | Voting is not open |

Take a screenshot of each message.

### 16.9 Election end and result

The election "ends" only in the sense that the contract stops accepting votes once the block time passes the end time. Nothing runs automatically.

- Before the end time, **Show winner** reports "Election not ended".
- After the end time, `vote()` fails with "Voting is not open" and **Show winner** returns the winner and vote count.
- Someone must click **Show winner**; the result is read from the contract on request.

**Quick demo without waiting an hour:** type your own times in the Start and End boxes instead of using the Fill button. Get the current Unix time with `date +%s` in Git Bash or `Math.floor(Date.now()/1000)` in the browser console. Use start = now + 30 and end = now + 300 for a five-minute election.

**Trust point to mention in viva:** the contract lets the admin call `setElectionPeriod` again, so the admin could extend or shorten the window even after voting has started. A hardened version would lock the window once voting begins.

### 16.10 Troubleshooting log (problems we met)

| Symptom | Cause | Fix |
|---|---|---|
| "MetaMask not found. Install the MetaMask extension." | Page opened as `file:///...`, or MetaMask not installed in this browser profile | Serve the page with `http-server` and open `http://localhost:8000`; confirm MetaMask is in the extensions menu |
| "Error: could not decode result data" | The `PrivateVoting` address (or a stale address) was pasted instead of the `Voting` address, or the node was restarted | Use the `Voting deployed at:` address; redeploy after any node restart |
| Page stuck on "Waiting for MetaMask confirmation..." | A MetaMask popup is pending but hidden | Click the MetaMask toolbar icon and approve or reject the request, then refresh the page |
| Status bar never shows ADMIN | Connection step not approved, or wrong account selected | Select Admin in MetaMask, click Connect wallet & load, tick Admin in the popup |
| Admin shows 0 ETH | MetaMask is not on the Hardhat Local network | Switch to Hardhat Local (chain ID 31337) |
| Nonce or "contract not found" errors after restarting `hardhat node` | The chain was reset | Run `npm run deploy:local` again; in MetaMask use Settings, Advanced, Clear activity tab data |
| "Voting is not open" | Current time outside the window | Wait for the start time, or set a new period as Admin |
| "Election already started" when adding a candidate | Start time has already passed | Add candidates before setting or reaching the start time |
| Pasted the whole `hardhat node` output into the address box | That output lists wallet accounts, not a contract address | Paste only the `Voting deployed at:` address from the deploy output |

### 16.11 Evidence checklist to capture while running

- [ ] `npx hardhat node` and `npm run deploy:local` output showing the contract addresses
- [ ] MetaMask on the Hardhat Local network with the four named accounts
- [ ] Front end showing `Connected as ... (ADMIN)`
- [ ] Candidates added and voters registered (status bar with transaction hashes)
- [ ] Election period set
- [ ] Successful votes from Voter1 and Voter2 with transaction hashes
- [ ] Each rejection message from section 16.8
- [ ] Winner shown after the end time
- [ ] `npx hardhat test` output showing 17 passing
