// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  try {
    console.log("Deploying ChatApp contract...");
    const ChatApp = await hre.ethers.getContractFactory("ChatApp");
    // Override gas parameters during deployment (optional since they are set in the network config)
    const chatApp = await ChatApp.deploy({
      gasLimit: 5000000,
      gasPrice: 25000000000
    });

    await chatApp.deployed();
    console.log(`ChatApp deployed successfully to: ${chatApp.address}`);
    return chatApp.address;
  } catch (error) {
    console.error("Error deploying contract:", error);
    process.exitCode = 1;
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
