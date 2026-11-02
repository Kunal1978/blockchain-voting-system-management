const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = await Voting.deploy();
  await voting.waitForDeployment();
  console.log("Voting deployed at:", await voting.getAddress());

  const Private = await hre.ethers.getContractFactory("PrivateVoting");
  const priv = await Private.deploy();
  await priv.waitForDeployment();
  console.log("PrivateVoting deployed at:", await priv.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
