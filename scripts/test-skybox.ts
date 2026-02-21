import dotenv from "dotenv";
dotenv.config();

async function testSkybox() {
    const apiKey = process.env.SKYBOX_API_KEY;
    if (!apiKey) {
        console.error("No API key found.");
        return;
    }

    console.log("Starting Skybox test...");

    try {
        const res = await fetch("https://backend.blockadelabs.com/api/v1/skybox", {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: "A 1930s vintage newsroom with typewriters, wooden desks, and reporters smoking cigars."
            })
        });

        const data = await res.json();
        console.log("Initial response:", data);

        if (data.id) {
            let status = data.status;
            let url = "";
            while (status === "pending" || status === "dispatched" || status === "processing") {
                console.log(`Waiting for completion, current status: ${status}...`);
                await new Promise(resolve => setTimeout(resolve, 5000));

                const checkRes = await fetch(`https://backend.blockadelabs.com/api/v1/imagine/requests/${data.id}`, {
                    headers: { "x-api-key": apiKey, "Accept": "application/json" }
                });
                const checkData = await checkRes.json();

                status = checkData?.request?.status || checkData.status;
                console.log("Status update:", status);
                if (status === "complete") {
                    console.log("Final URL:", checkData?.request?.file_url || checkData.file_url);
                } else if (status === "error" || status === "abort") {
                    console.log("Error details:", checkData?.request?.error_message || checkData.error_message);
                }
            }
        }
    } catch (e) {
        console.error("Test failed:", e);
    }
}

testSkybox();
