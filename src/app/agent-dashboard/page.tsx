"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FundAgentButton } from "@/components/FundAgentButton";

export default function AgentDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/agent/stats")
            .then((r) => r.json())
            .then((data) => {
                if (data.error) setError(data.error);
                else setStats(data);
            })
            .catch((e) => setError(e.message));
    }, []);

    return (
        <div className="min-h-screen bg-[#F4F1EA] text-[#2C2C2C] font-serif p-8">
            <div className="max-w-4xl mx-auto">
                <header className="border-b-4 border-[#2C2C2C] pb-6 mb-10 text-center flex justify-between items-end">
                    <Link href="/" className="text-xl hover:underline">
                        ← Return to Edition
                    </Link>
                    <div className="text-right">
                        <h1 className="text-5xl font-black uppercase tracking-widest text-[#1a1a1a] mb-2">
                            Autonomous Agent Transparency
                        </h1>
                        <h2 className="text-2xl italic font-light text-gray-700">
                            Live Economic Ledger of The Base Syndicate Editor
                        </h2>
                    </div>
                </header>

                {error && (
                    <div className="bg-red-100 text-red-800 p-4 border border-red-300 font-mono mb-6">
                        ERROR CONNECTING TO BASE NETWORK VIA CDP: {error}
                    </div>
                )}

                {!stats && !error && (
                    <div className="text-xl animate-pulse font-mono text-center my-20">
                        CONNECTING TO COINBASE DEVELOPER PLATFORM (CDP) API...
                    </div>
                )}

                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <section className="bg-white border-2 border-[#2C2C2C] p-8 shadow-[8px_8px_0px_#2c2c2c]">
                            <h3 className="text-3xl font-bold uppercase mb-6 flex items-center gap-3">
                                Treasurer Wallet
                                {stats.solvent ?
                                    <span className="bg-green-100 text-green-800 text-sm px-3 py-1 ml-auto font-mono">SOLVENT</span> :
                                    <span className="bg-red-100 text-red-800 text-sm px-3 py-1 ml-auto font-mono">INSOLVENT</span>
                                }
                            </h3>

                            <div className="font-mono space-y-4 text-lg">
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="text-gray-500">NETWORK:</span>
                                    <span className="font-bold">Base Sepolia (CDP API)</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-2 truncate">
                                    <span className="text-gray-500 mr-4">ADDRESS:</span>
                                    <span className="font-bold truncate" title={stats.address}>
                                        {stats.address}
                                    </span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="text-gray-500">ETH BALANCE:</span>
                                    <span className="font-bold">{stats.eth} ETH</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="text-gray-500">USDC BALANCE:</span>
                                    <span className="font-bold">${stats.usdc}</span>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white border-2 border-[#2C2C2C] p-8 shadow-[8px_8px_0px_#2c2c2c]">
                            <h3 className="text-3xl font-bold uppercase mb-6 flex items-center gap-3">
                                Compute Metrics
                            </h3>
                            <div className="font-mono space-y-4 text-lg">
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="text-gray-500">ARTICLES GENERATED:</span>
                                    <span className="font-bold">{stats.stats?.articlesGenerated}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="text-gray-500">TOTAL AI COMPUTE SPEND:</span>
                                    <span className="font-bold text-red-600">-${stats.stats?.totalCost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="text-gray-500">TOTAL SUBSCRIPTIONS:</span>
                                    <span className="font-bold text-green-600">+${stats.stats?.incomeReceived.toFixed(2)}</span>
                                </div>

                                <div className="mt-8 bg-gray-100 p-4 border-l-4 border-blue-600 rounded">
                                    <p className="font-serif text-sm italic text-gray-700">
                                        <strong>Self-Sustaining Protocol Actuated:</strong> If the active agent wallet liquidities drop below minimum viable compute thresholds, the newspaper ceases autonomous printing until reader NFTs independently replenish the mainnet treasury.
                                    </p>
                                    <FundAgentButton agentAddress={stats.address} />
                                </div>
                            </div>
                        </section>

                        <section className="bg-[#1a1a1a] text-white border-2 border-black p-8 md:col-span-2">
                            <h3 className="text-2xl font-bold font-mono uppercase mb-4 text-cyan-400">
                                [ERC-8021 Builder Context Tracking Active]
                            </h3>
                            <p className="font-mono text-sm leading-relaxed text-gray-400">
                                Every transaction generated autonomously by this agent interacts directly with Base Mainnet using EVM payload `data` injections. We strictly embed the `8021:future-express-agent` builder payload signature onto all outgoing requests. This grants Base deep analytics transparency into our agentic economy.
                            </p>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
