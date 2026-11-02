const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Voting (basic)", function () {
  let voting, admin, v1, v2, v3;

  beforeEach(async () => {
    [admin, v1, v2, v3] = await ethers.getSigners();
    voting = await (await ethers.getContractFactory("Voting")).deploy();
    await voting.waitForDeployment();
    await voting.addCandidate("Alice", "Party A");
    await voting.addCandidate("Bob", "Party B");
    await voting.registerVoter(v1.address);
    await voting.registerVoter(v2.address);
    const now = await time.latest();
    await voting.setElectionPeriod(now + 100, now + 1000);
  });

  it("TC1: admin adds candidate", async () => {
    expect(await voting.candidatesCount()).to.equal(2);
  });

  it("TC2: non-admin cannot add candidate", async () => {
    await expect(voting.connect(v1).addCandidate("X", "Y")).to.be.revertedWith("Only admin allowed");
  });

  it("TC3: admin registers voter", async () => {
    expect(await voting.isRegistered(v1.address)).to.equal(true);
  });

  it("TC4: registered voter can vote and count increases", async () => {
    await time.increase(200);
    await expect(voting.connect(v1).vote(1)).to.emit(voting, "Voted").withArgs(v1.address, 1);
    expect((await voting.candidates(1)).voteCount).to.equal(1);
  });

  it("TC5: double voting is rejected", async () => {
    await time.increase(200);
    await voting.connect(v1).vote(1);
    await expect(voting.connect(v1).vote(2)).to.be.revertedWith("You have already voted");
  });

  it("TC6: unregistered user cannot vote", async () => {
    await time.increase(200);
    await expect(voting.connect(v3).vote(1)).to.be.revertedWith("Not a registered voter");
  });

  it("TC7: cannot vote before start", async () => {
    await expect(voting.connect(v1).vote(1)).to.be.revertedWith("Voting is not open");
  });

  it("TC8: cannot vote after end", async () => {
    await time.increase(2000);
    await expect(voting.connect(v1).vote(1)).to.be.revertedWith("Voting is not open");
  });

  it("TC9: invalid candidate id is rejected", async () => {
    await time.increase(200);
    await expect(voting.connect(v1).vote(0)).to.be.revertedWith("Invalid candidate");
    await expect(voting.connect(v1).vote(3)).to.be.revertedWith("Invalid candidate");
  });

  it("TC10: winner is returned after the election ends", async () => {
    await time.increase(200);
    await voting.connect(v1).vote(2);
    await voting.connect(v2).vote(2);
    await expect(voting.getWinner()).to.be.revertedWith("Election not ended");
    await time.increase(2000);
    const [name, votes] = await voting.getWinner();
    expect(name).to.equal("Bob");
    expect(votes).to.equal(2);
  });
});
