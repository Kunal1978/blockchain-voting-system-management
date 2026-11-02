const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PrivateVoting (commit-reveal)", function () {
  let pv, admin, v1, v2, v3;
  const salt1 = ethers.hexlify(ethers.randomBytes(32));
  const salt2 = ethers.hexlify(ethers.randomBytes(32));

  const commitment = (id, salt, addr) =>
    ethers.solidityPackedKeccak256(["uint256", "bytes32", "address"], [id, salt, addr]);

  beforeEach(async () => {
    [admin, v1, v2, v3] = await ethers.getSigners();
    pv = await (await ethers.getContractFactory("PrivateVoting")).deploy();
    await pv.waitForDeployment();
    await pv.addCandidate("Alice");
    await pv.addCandidate("Bob");
    await pv.registerVoter(v1.address);
    await pv.registerVoter(v2.address);
    await pv.startCommitPhase();
  });

  it("P1: commit stores commitment, tally unchanged", async () => {
    await pv.connect(v1).commitVote(commitment(0, salt1, v1.address));
    expect((await pv.candidates(0)).voteCount).to.equal(0);
  });

  it("P2: reveal during commit phase fails", async () => {
    await pv.connect(v1).commitVote(commitment(0, salt1, v1.address));
    await expect(pv.connect(v1).revealVote(0, salt1)).to.be.revertedWith("Wrong phase");
  });

  it("P3: wrong salt or wrong candidate fails", async () => {
    await pv.connect(v1).commitVote(commitment(0, salt1, v1.address));
    await pv.startRevealPhase();
    await expect(pv.connect(v1).revealVote(0, salt2)).to.be.revertedWith("Hash mismatch");
    await expect(pv.connect(v1).revealVote(1, salt1)).to.be.revertedWith("Hash mismatch");
  });

  it("P4: reveal twice fails", async () => {
    await pv.connect(v1).commitVote(commitment(0, salt1, v1.address));
    await pv.startRevealPhase();
    await pv.connect(v1).revealVote(0, salt1);
    await expect(pv.connect(v1).revealVote(0, salt1)).to.be.revertedWith("Already revealed");
  });

  it("P5: commit twice fails", async () => {
    await pv.connect(v1).commitVote(commitment(0, salt1, v1.address));
    await expect(pv.connect(v1).commitVote(commitment(1, salt1, v1.address))).to.be.revertedWith("Already committed");
  });

  it("P6: unregistered address cannot commit", async () => {
    await expect(pv.connect(v3).commitVote(commitment(0, salt1, v3.address))).to.be.revertedWith("Not registered");
  });

  it("P7: winner only after election ends, and is correct", async () => {
    await pv.connect(v1).commitVote(commitment(1, salt1, v1.address));
    await pv.connect(v2).commitVote(commitment(1, salt2, v2.address));
    await pv.startRevealPhase();
    await pv.connect(v1).revealVote(1, salt1);
    await pv.connect(v2).revealVote(1, salt2);
    await expect(pv.getWinner()).to.be.revertedWith("Wrong phase");
    await pv.endElection();
    const [name, votes] = await pv.getWinner();
    expect(name).to.equal("Bob");
    expect(votes).to.equal(2);
  });
});
