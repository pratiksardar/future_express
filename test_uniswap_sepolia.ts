import fetch from "node-fetch";

async function main() {
  const tokenInAddress = "ETH";
  const tokenOutAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
  const amount = "1000000000000000"; // 0.001 ETH
  const url = `https://interface.gateway.uniswap.org/v1/quote?tokenInChainId=84532&tokenInAddress=${tokenInAddress}&tokenOutChainId=84532&tokenOutAddress=${tokenOutAddress}&amount=${amount}&type=exactIn`;
  
  try {
     const res = await fetch(url, { headers: { "origin": "https://app.uniswap.org" }});
     const data = await res.json();
     console.log(JSON.stringify(data, null, 2));
  } catch(e) { console.error(e); }
}

main();
