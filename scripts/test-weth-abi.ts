import { ethers } from "ethers";
const WETH_ABI = ["function deposit() payable", "function withdraw(uint wad)", "function balanceOf(address) view returns (uint)"];
console.log(ethers.Interface.from(WETH_ABI).encodeFunctionData("deposit"));
