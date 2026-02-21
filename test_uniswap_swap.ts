import fetch from "node-fetch";

async function main() {
  const url = `https://interface.gateway.uniswap.org/v1/quote?tokenInChainId=8453&tokenInAddress=0x4200000000000000000000000000000000000006&tokenOutChainId=8453&tokenOutAddress=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&amount=10000000000000000&type=exactIn`;
  
  try {
     const res = await fetch(url, { headers: { "origin": "https://app.uniswap.org" }});
     const data = await res.json();
     console.log("Found route of length", data.route?.[0]?.length);
  } catch(e) { console.error(e); }
}
main();
