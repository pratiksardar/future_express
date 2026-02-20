import { generateMorningEdition } from "./src/lib/articles/generate";

async function main() {
    console.log("Generating articles...");
    try {
        const res = await generateMorningEdition(5);
        console.log("Result:", res);
    } catch (e) {
        console.error("Crash:", e);
    }
    process.exit(0);
}

main();
