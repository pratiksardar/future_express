import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import OpenAI from "openai";
import { RPC, ZERO_G_PROVIDERS, config } from "@/lib/config";
import { loggers } from "@/lib/logger";
import { chatCompletion } from "@/lib/articles/llm";

export async function get0GAIResponse(prompt: string, systemPrompt?: string): Promise<string> {
    const privateKey = config.BASE_SEPOLIA_PRIVATE_KEY?.trim();
    if (!privateKey) {
        throw new Error('BASE_SEPOLIA_PRIVATE_KEY is required for 0G Compute');
    }

    try {
        // 0G Newton Testnet RPC
        const provider = new ethers.JsonRpcProvider(RPC.ZERO_G_TESTNET);
        const wallet = new ethers.Wallet(privateKey, provider);

        loggers.zeroG.info({ wallet: wallet.address }, "Initializing broker");
        const broker = await createZGComputeNetworkBroker(wallet);

        const providerAddress = ZERO_G_PROVIDERS["llama-3.3-70b-instruct"];

        loggers.zeroG.debug({ providerAddress }, "Getting service metadata");
        const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);

        loggers.zeroG.debug("Getting request headers");
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

        loggers.zeroG.info({ model, endpoint }, "Sending inference request");
        const completion = await openai.chat.completions.create(
            { messages, model },
            { headers: requestHeaders }
        );

        const content = completion.choices[0].message.content || "";
        const chatId = completion.id;

        try {
            await broker.inference.processResponse(providerAddress, chatId, content);
            loggers.zeroG.info("Successfully processed payment for inference");
        } catch (err: any) {
            loggers.zeroG.warn({ err: err.message }, "Failed to process payment (likely missing 0G funds)");
        }

        return content;
    } catch (err: any) {
        loggers.zeroG.warn({ err: err.message }, "0G Compute failed, falling back to priority-ordered LLM providers");

        // Graceful Fallback: uses the priority-ordered provider chain (OpenRouter → OpenAI → Anthropic, etc.)
        const messages: { role: "system" | "user" | "assistant", content: string }[] = [];
        if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
        messages.push({ role: "user", content: prompt });

        const result = await chatCompletion({ messages });
        loggers.zeroG.info({ provider: result.provider, model: result.model }, "Fallback LLM responded");
        return result.content;
    }
}
