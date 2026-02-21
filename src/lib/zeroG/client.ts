import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import OpenAI from "openai";

const OFFICIAL_PROVIDERS = {
    // We'll use Llama 3 for our main text generation
    "llama-3.3-70b-instruct": "0xa48f01287233509FD694a22Bf840225062E67836",
};

export async function get0GAIResponse(prompt: string, systemPrompt?: string): Promise<string> {
    const privateKey = process.env.BASE_SEPOLIA_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('BASE_SEPOLIA_PRIVATE_KEY is required for 0G Compute');
    }

    try {
        // 0G Newton Testnet RPC
        const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
        const wallet = new ethers.Wallet(privateKey, provider);

        console.log(`[0G] Initializing broker for wallet ${wallet.address}...`);
        const broker = await createZGComputeNetworkBroker(wallet);

        const providerAddress = OFFICIAL_PROVIDERS["llama-3.3-70b-instruct"];

        console.log(`[0G] Getting service metadata for provider ${providerAddress}...`);
        const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);

        console.log(`[0G] Getting request headers...`);
        const headers = await broker.inference.getRequestHeaders(providerAddress, prompt);

        const openai = new OpenAI({
            baseURL: endpoint,
            apiKey: "", // Empty for 0G
        });

        const requestHeaders: Record<string, string> = {};
        Object.entries(headers).forEach(([key, value]) => {
            if (typeof value === 'string') {
                requestHeaders[key] = value;
            }
        });

        const messages: { role: "system" | "user", content: string }[] = [];
        if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
        messages.push({ role: "user", content: prompt });

        console.log(`[0G] Sending inference request to model ${model} at ${endpoint}...`);
        const completion = await openai.chat.completions.create(
            { messages, model },
            { headers: requestHeaders }
        );

        const content = completion.choices[0].message.content || "";
        const chatId = completion.id;

        try {
            await broker.inference.processResponse(providerAddress, chatId, content);
            console.log(`[0G] Successfully processed payment for inference`);
        } catch (err: any) {
            console.warn(`[0G] Failed to process payment (likely missing 0G funds for the fee, but we got the response!):`, err.message);
        }

        return content;
    } catch (err: any) {
        console.warn(`[0G Compute Exception] ${err.message}`);
        console.log(`[0G Compute] Gracefully falling back to traditional AI inference due to missing 0G Testnet Sub-account funds...`);

        // Graceful Fallback for demo purposes if 0G Testnet wallet isn't funded
        const fallbackOpenAI = new OpenAI({
            baseURL: process.env.OPENROUTER_API_KEY ? "https://openrouter.ai/api/v1" : undefined,
            apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
        });

        const fallbackMessages: { role: "system" | "user", content: string }[] = [];
        if (systemPrompt) fallbackMessages.push({ role: "system", content: systemPrompt });
        fallbackMessages.push({ role: "user", content: prompt });

        const completion = await fallbackOpenAI.chat.completions.create({
            messages: fallbackMessages,
            model: process.env.OPENROUTER_API_KEY ? "openai/gpt-4o-mini" : "gpt-4o-mini",
        });

        return completion.choices[0].message.content || "";
    }
}
