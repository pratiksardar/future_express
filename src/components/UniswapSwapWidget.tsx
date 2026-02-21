"use client";

import { useState, useCallback } from "react";

const ETH_MAINNET_CHAIN_ID = 1;
const ETH_SEPOLIA_CHAIN_ID = 11155111;
const useSepolia = process.env.NEXT_PUBLIC_USE_BASE_SEPOLIA === "true" || process.env.NEXT_PUBLIC_USE_ETH_SEPOLIA === "true";
const CHAIN_ID = useSepolia ? ETH_SEPOLIA_CHAIN_ID : ETH_MAINNET_CHAIN_ID;
const CHAIN_LABEL = useSepolia ? "Ethereum Sepolia" : "Ethereum Mainnet";
const WETH_DECIMALS = 18;

type QuoteResult = {
  quote: unknown;
  routing: string;
  permitData: unknown;
  amountWei: string;
};

function toWei(eth: string): string {
  const parts = eth.trim().split(".");
  const whole = parts[0] || "0";
  const frac = (parts[1] || "").padEnd(WETH_DECIMALS, "0").slice(0, WETH_DECIMALS);
  const combined = whole === "0" && frac ? frac.replace(/^0+/, "") || "0" : whole + frac;
  return combined || "0";
}

export function UniswapSwapWidget() {
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "quoting" | "swapping" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const connectWallet = useCallback(async () => {
    const win = typeof window !== "undefined" ? window : null;
    const w = win && "ethereum" in win ? (win as { ethereum: { request: (args: { method: string }) => Promise<unknown[]> } }).ethereum : undefined;
    if (!w) {
      setMessage("No wallet found. Install MetaMask or another Web3 wallet.");
      setStatus("error");
      return;
    }
    try {
      const accounts = (await w.request({ method: "eth_requestAccounts" })) as string[];
      if (accounts[0]) {
        setAddress(accounts[0]);
        setMessage("");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to connect");
      setStatus("error");
    }
  }, []);

  const fetchQuote = useCallback(async () => {
    if (!amount || !address) {
      setMessage(address ? "Enter an amount" : "Connect wallet first");
      setStatus("error");
      return;
    }
    const amountWei = toWei(amount);
    if (amountWei === "0") {
      setMessage("Enter a valid amount");
      setStatus("error");
      return;
    }
    setStatus("quoting");
    setMessage("");
    try {
      const res = await fetch("/api/uniswap/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountWei, swapper: address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Quote failed");
      setQuote({
        quote: data.quote,
        routing: data.routing ?? "CLASSIC",
        permitData: data.permitData ?? undefined,
        amountWei,
      });
      setStatus("idle");
      setMessage(
        data.routing && !["CLASSIC", "WRAP", "UNWRAP", "BRIDGE"].includes(data.routing)
          ? "Gasless routing available; execute via Swap to use protocol swap."
          : ""
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Quote failed");
      setStatus("error");
    }
  }, [amount, address]);

  const executeSwap = useCallback(async () => {
    if (!quote || !address) return;
    const win = typeof window !== "undefined" ? window : null;
    const w = win && "ethereum" in win ? (win as { ethereum: unknown }).ethereum : undefined;
    if (!w) {
      setMessage("No wallet found.");
      setStatus("error");
      return;
    }
    setStatus("swapping");
    setMessage("");
    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.BrowserProvider(w as never);
      const signer = await provider.getSigner();

      let signature: string | undefined;
      if (quote.permitData && typeof quote.permitData === "object" && quote.permitData !== null) {
        setMessage(`Please sign Swap permit.`);
        const pd = quote.permitData as any;
        const typesToSign = { ...(pd.types || {}) };
        if (typesToSign.EIP712Domain) delete typesToSign.EIP712Domain;

        signature = await signer.signTypedData(
          pd.domain,
          typesToSign,
          pd.values
        );
      }
      const swapRes = await fetch("/api/uniswap/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote: quote.quote,
          signature: signature ?? undefined,
          permitData: quote.permitData ?? undefined,
        }),
      });
      const swapData = await swapRes.json();
      if (!swapRes.ok) throw new Error(swapData.error ?? "Swap failed");
      const tx = swapData.swap;
      if (!tx || !tx.to || !tx.data) throw new Error("Invalid swap response");
      const chainId = Number(tx.chainId);
      if (chainId !== CHAIN_ID) {
        try {
          await provider.send("wallet_switchEthereumChain", [{ chainId: `0x${CHAIN_ID.toString(16)}` }]);
        } catch {
          setMessage(`Please switch to ${CHAIN_LABEL} in your wallet.`);
          setStatus("error");
          return;
        }
      }
      const txReq = {
        to: tx.to,
        value: tx.value ? BigInt(tx.value) : BigInt(0),
        data: tx.data,
        gasLimit: tx.gas ? BigInt(tx.gas) : undefined,
      };
      const sent = await signer.sendTransaction(txReq);
      setMessage(`Transaction sent: ${sent.hash}`);
      setStatus("success");
      setQuote(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Swap failed");
      setStatus("error");
    }
  }, [quote, address]);

  return (
    <div className="mt-8 p-4 border-2 border-[var(--color-rule-dark)] bg-[var(--color-paper-cream)]">
      <h4 className="section-title mb-3">Swap ETH → USDC ({CHAIN_LABEL})</h4>
      <p className="text-sm text-[var(--color-ink-light)] mb-3">
        Get USDC on {CHAIN_LABEL} to place a bet on Polymarket. Powered by Uniswap.
      </p>
      {!address ? (
        <button
          type="button"
          onClick={connectWallet}
          className="w-full py-2 px-4 bg-[var(--color-accent-blue)] text-white font-[family-name:var(--font-ui)] uppercase tracking-wide hover:opacity-90"
        >
          Connect wallet
        </button>
      ) : (
        <>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 px-3 py-2 border border-[var(--color-rule)] bg-white text-[var(--color-ink)] font-[family-name:var(--font-data)]"
            />
            <span className="self-center text-[var(--color-ink-light)] text-sm">ETH</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={fetchQuote}
              disabled={status === "quoting"}
              className="py-2 px-4 border border-[var(--color-rule-dark)] font-[family-name:var(--font-ui)] uppercase tracking-wide disabled:opacity-50"
            >
              {status === "quoting" ? "Getting quote…" : "Get quote"}
            </button>
            {quote && (quote.routing === "CLASSIC" || quote.routing === "WRAP" || quote.routing === "UNWRAP" || quote.routing === "BRIDGE") && (
              <button
                type="button"
                onClick={executeSwap}
                disabled={status === "swapping"}
                className="py-2 px-4 bg-[var(--color-spot-green)] text-white font-[family-name:var(--font-ui)] uppercase tracking-wide disabled:opacity-50"
              >
                {status === "swapping" ? "Swapping…" : "Swap"}
              </button>
            )}
          </div>
          <p className="text-xs text-[var(--color-ink-faded)] mt-2">
            {address.slice(0, 6)}…{address.slice(-4)}
          </p>
        </>
      )}
      {message && (
        <p className={`mt-3 text-sm ${status === "error" ? "text-[var(--color-spot-red)]" : "text-[var(--color-ink-medium)]"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
