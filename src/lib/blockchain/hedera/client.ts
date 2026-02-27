import { Client, TopicCreateTransaction, TopicMessageSubmitTransaction, PrivateKey, AccountId } from "@hashgraph/sdk";
import { loggers } from "@/lib/logger";

let hederaClient: Client | null = null;
let defaultTopicId: string | null = null;

function getClient(): Client {
    if (hederaClient) return hederaClient;

    const accountIdStr = process.env.HEDERA_ACCOUNT_ID?.trim();
    const privateKeyStr = process.env.HEDERA_PRIVATE_KEY?.trim();

    if (!accountIdStr || !privateKeyStr) {
        throw new Error("Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY");
    }

    const accountId = AccountId.fromString(accountIdStr);
    const privateKey = PrivateKey.fromStringECDSA(privateKeyStr); // or fromString for ED25519
    // Wait, the standard base sepolia private key is ECDSA!

    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);
    hederaClient = client;
    return client;
}

export async function logEditorialDecision(editionId: string, decisions: any) {
    try {
        const client = getClient();

        // Ensure we have a topic for logging editorial layouts
        if (!defaultTopicId) {
            loggers.hedera.info("Creating new HCS Topic for Editorial Decisions");
            const txResponse = await new TopicCreateTransaction().execute(client);
            const receipt = await txResponse.getReceipt(client);
            defaultTopicId = receipt.topicId?.toString() || null;
            loggers.hedera.info({ topicId: defaultTopicId }, "Created Topic");
        }

        if (!defaultTopicId) {
            throw new Error("Failed to create Hedera Topic");
        }

        const messageData = JSON.stringify({
            event: "EDITORIAL_LAYOUT_DECISION",
            editionId,
            timestamp: new Date().toISOString(),
            decisions
        });

        loggers.hedera.info({ topicId: defaultTopicId }, "Submitting message to HCS Topic");
        const submitTx = await new TopicMessageSubmitTransaction({
            topicId: defaultTopicId,
            message: messageData
        }).execute(client);

        const receipt = await submitTx.getReceipt(client);
        loggers.hedera.info({ status: receipt.status.toString() }, "Message successfully logged");
        return true;
    } catch (e: any) {
        loggers.hedera.warn({ err: e.message }, "Failed to log editorial decision to HCS");
        loggers.hedera.info("Ensure HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY are set and funded");
        return false;
    }
}
