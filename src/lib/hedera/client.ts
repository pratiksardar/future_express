import { Client, TopicCreateTransaction, TopicMessageSubmitTransaction, PrivateKey, AccountId } from "@hashgraph/sdk";

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
            console.log("[Hedera] Creating new HCS Topic for Editorial Decisions...");
            const txResponse = await new TopicCreateTransaction().execute(client);
            const receipt = await txResponse.getReceipt(client);
            defaultTopicId = receipt.topicId?.toString() || null;
            console.log(`[Hedera] Created Topic ID: ${defaultTopicId}`);
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

        console.log(`[Hedera] Submitting message to HCS Topic ${defaultTopicId}...`);
        const submitTx = await new TopicMessageSubmitTransaction({
            topicId: defaultTopicId,
            message: messageData
        }).execute(client);

        const receipt = await submitTx.getReceipt(client);
        console.log(`[Hedera] Message successfully logged! Status: ${receipt.status.toString()}`);
        return true;
    } catch (e: any) {
        console.warn(`[Hedera Exception] Failed to log editorial decision to HCS: ${e.message}`);
        console.log(`[Hedera] Please ensure HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY are set and funded in .env`);
        return false;
    }
}
