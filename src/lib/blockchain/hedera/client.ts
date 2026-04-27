import {
    Client,
    TopicCreateTransaction,
    TopicId,
    TopicMessageSubmitTransaction,
    PrivateKey,
    AccountId,
    TransactionId,
} from "@hashgraph/sdk";
import { loggers } from "@/lib/logger";

let hederaClient: Client | null = null;
/**
 * Topic id used for editorial decisions. Resolution order:
 *   1. process.env.HEDERA_TOPIC_ID (preferred — stable per environment)
 *   2. Lazily-created topic via TopicCreateTransaction (dev fallback;
 *      logged and held in-memory for the life of the process).
 */
let defaultTopicId: string | null = null;

function getClient(): Client {
    if (hederaClient) return hederaClient;

    const accountIdStr = process.env.HEDERA_ACCOUNT_ID?.trim();
    const privateKeyStr = process.env.HEDERA_PRIVATE_KEY?.trim();

    if (!accountIdStr || !privateKeyStr) {
        throw new Error("Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY");
    }

    const accountId = AccountId.fromString(accountIdStr);
    const privateKey = PrivateKey.fromStringECDSA(privateKeyStr); // Hedera testnet wallets default to ECDSA.

    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);
    hederaClient = client;
    return client;
}

async function ensureTopicId(client: Client): Promise<string> {
    const fromEnv = process.env.HEDERA_TOPIC_ID?.trim();
    if (fromEnv) {
        defaultTopicId = fromEnv;
        return fromEnv;
    }
    if (defaultTopicId) return defaultTopicId;

    loggers.hedera.info("Creating new HCS Topic for Editorial Decisions");
    const txResponse = await new TopicCreateTransaction().execute(client);
    const receipt = await txResponse.getReceipt(client);
    const created = receipt.topicId?.toString();
    if (!created) throw new Error("Failed to create Hedera Topic");
    defaultTopicId = created;
    loggers.hedera.info({ topicId: defaultTopicId }, "Created Topic");
    return defaultTopicId;
}

export type EditorialDecisionPayload = {
    type: string;
    editionId: string;
    [k: string]: unknown;
};

export type LogEditorialDecisionResult = {
    success: boolean;
    /** Hedera TransactionId in canonical form `0.0.X@SECONDS.NANOS` */
    transactionId?: string;
    /** Topic the message was submitted to */
    topicId?: string;
    /** Final receipt status, e.g. "SUCCESS" */
    status?: string;
    /** ISO timestamp when we submitted (client-side; not consensus time) */
    submittedAt?: string;
    error?: string;
};

/**
 * Log an editorial decision to Hedera Consensus Service.
 *
 * Two call shapes are supported (back-compat with the original P1 stub):
 *   1. logEditorialDecision(editionId, decisions)  — wraps in {event,editionId,decisions}
 *   2. logEditorialDecision(payload)               — submits payload as-is
 *
 * Returns a structured result so callers can persist the TX id back to the
 * database. Throws never — all failures land in `result.success === false`.
 */
export async function logEditorialDecision(
    payloadOrEditionId: string | EditorialDecisionPayload,
    decisions?: unknown,
): Promise<LogEditorialDecisionResult> {
    const submittedAt = new Date().toISOString();

    let messageObject: Record<string, unknown>;
    let editionIdForLog: string;
    if (typeof payloadOrEditionId === "string") {
        editionIdForLog = payloadOrEditionId;
        messageObject = {
            event: "EDITORIAL_LAYOUT_DECISION",
            editionId: payloadOrEditionId,
            timestamp: submittedAt,
            decisions,
        };
    } else {
        editionIdForLog = payloadOrEditionId.editionId;
        messageObject = {
            ...payloadOrEditionId,
            // Always include a wall-clock timestamp; the consensus timestamp
            // will be available via the mirror node after submit.
            submittedAt,
        };
    }

    try {
        const client = getClient();
        const topicId = await ensureTopicId(client);

        const messageData = JSON.stringify(messageObject);

        loggers.hedera.info(
            { topicId, editionId: editionIdForLog },
            "Submitting message to HCS Topic",
        );

        const submitTx = await new TopicMessageSubmitTransaction({
            topicId: TopicId.fromString(topicId),
            message: messageData,
        }).execute(client);

        const receipt = await submitTx.getReceipt(client);
        const status = receipt.status.toString();
        const txId: TransactionId | null = submitTx.transactionId ?? null;
        const transactionId = txId ? txId.toString() : undefined;

        loggers.hedera.info(
            { status, topicId, transactionId, editionId: editionIdForLog },
            "Message successfully logged",
        );

        return {
            success: true,
            transactionId,
            topicId,
            status,
            submittedAt,
        };
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        loggers.hedera.warn(
            { err: message, editionId: editionIdForLog },
            "Failed to log editorial decision to HCS",
        );
        loggers.hedera.info(
            "Ensure HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY, and HEDERA_TOPIC_ID are set and funded",
        );
        return { success: false, error: message, submittedAt };
    }
}
