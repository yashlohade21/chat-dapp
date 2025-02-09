import chatApp from "./ChatApp.json";

//HARDHAT ADDRESS
// export const ChatAppAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
//POLYGON ADDRESS (ensure this is the latest deployed contract with patient data functions)
export const ChatAppAddress = "0x7fAB7AEAB965240986e42729210Cf6E9Fdf26A5f";
export const ChatAppABI = chatApp.abi;

//NETWORK
const networks = {
  polygon_amoy: {
    chainId: "0x13882",  // 80002 in hex using 0x prefix
    chainName: "Polygon Amoy",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
    rpcUrls: ["https://rpc-amoy.polygon.technology/"],
    blockExplorerUrls: ["https://www.oklink.com/amoy"],
  },
  // ... other networks if needed ...
};

const changeNetwork = async ({ networkName }) => {
  try {
    if (!window.ethereum) throw new Error("No crypto wallet found");
    
    if (!networks[networkName]) {
      throw new Error(`Network ${networkName} not configured`);
    }

    try {
      // First try to switch to the network
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: networks[networkName].chainId }],
      });
    } catch (switchError) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              ...networks[networkName],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  } catch (err) {
    console.error("Network switch error:", err.message);
    throw err; // Re-throw to handle in UI
  }
};

export const handleNetworkSwitch = async () => {
  const networkName = "polygon_amoy";
  await changeNetwork({ networkName });
};
