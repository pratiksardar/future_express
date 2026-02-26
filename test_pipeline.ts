import { runEditionPipeline } from "./src/lib/articles/generate";

async function main() {
    console.log("Running pipeline...");
    try {
        const res = await runEditionPipeline();
        console.log("Pipeline Result:", res);
    } catch (e) {
        console.error("Crash:", e);
    }
    process.exit(0);
}

main();
