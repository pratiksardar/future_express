import { ethers } from "ethers";

async function run() {
  const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
  const address = await provider.resolveName("futureeditor.base.eth");
  console.log("Resolved:", address);
}
run();
