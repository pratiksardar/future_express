import fetch from "node-fetch";

async function simulateQuickNodeHyperliquidStream() {
    console.log("Simulating QuickNode Hyperliquid Stream payload sent to our Webhook...");

    const payload = [
        {
            streamId: "hypercore-stream-01",
            network: "hyperliquid",
            dataset: "l2_events",
            data: {
                coin: "BTC",
                volume: "Spike +400%",
                action: "Liquidation Cascade"
            }
        },
        {
            streamId: "hypercore-stream-01",
            network: "hyperliquid",
            dataset: "l2_events",
            data: {
                coin: "ETH",
                volume: "Massive Buy Wall",
                action: "Whale Alert"
            }
        }
    ];

    try {
        const res = await fetch("http://localhost:3000/api/quicknode/webhook", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const body = await res.text();
        console.log("Webhook Response:", res.status, body);

    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

simulateQuickNodeHyperliquidStream();
