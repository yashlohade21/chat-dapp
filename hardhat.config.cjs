require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const NEXT_PUBLIC_PRIVATE_KEY = process.env.NEXT_PUBLIC_PRIVATE_KEY || "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Remove the '0x' prefix if present
const privateKey = NEXT_PUBLIC_PRIVATE_KEY.replace("0x", "");

module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    polygon_amoy: {
      url: "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: [`0x${privateKey}`],
      gas: 5000000,
      gasPrice: 25000000000
    }
  }
};