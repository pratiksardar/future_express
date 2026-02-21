"use client";

import { useState } from "react";
import { ethers } from "ethers";

declare global {
    interface Window {
        ethereum?: any;
    }
}

export function FundAgentButton({ agentAddress }: { agentAddress: string }) {
    const [funding, setFunding] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const fundAgent = async () => {
        try {
            setFunding(true);
            setError("");
            setSuccess(false);

            if (!window.ethereum) {
                throw new Error("No crypto wallet found. Please install MetaMask or Coinbase Wallet.");
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            const tx = await signer.sendTransaction({
                to: agentAddress,
                value: ethers.parseEther("0.001") // Donate 0.001 ETH to keep the agent alive
            });

            await tx.wait(1);
            setSuccess(true);
        } catch (e: any) {
            setError(e.shortMessage || e.message);
        } finally {
            setFunding(false);
        }
    };

    return (
        <div className="mt-8 border-t border-gray-300 pt-6">
            <h4 className="text-xl font-bold mb-3 uppercase tracking-widest text-[#1a1a1a]">
                Fund The Editor
            </h4>
            <p className="text-gray-600 mb-4 font-mono text-sm leading-relaxed max-w-lg">
                Keep the Future Express syndicate running. Autonomous agents require liquid Base Mainnet compute pools. Send exactly 0.001 ETH to prevent insolvency protocol shutdowns.
            </p>

            <button
                onClick={fundAgent}
                disabled={funding}
                className="bg-black text-white px-6 py-3 font-mono font-bold uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 transition"
            >
                {funding ? "TRANSACTING..." : "FUND 0.001 ETH VIA WALLET"}
            </button>

            {success && <div className="text-green-600 mt-2 font-mono font-bold">Successfully funded! The Agent breathes another day.</div>}
            {error && <div className="text-red-500 mt-2 font-mono break-words text-sm max-w-lg">{error}</div>}
        </div>
    );
}
