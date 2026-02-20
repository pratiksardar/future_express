import fs from "fs";

async function testImage() {
    const url = "https://openrouter.ai/api/v1/chat/completions";
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            // model: "bytedance-seed/seedream-4.5",
            model: "sourceful/riverflow-v2-fast:free",
            messages: [
                { role: "user", content: "A futuristic newspaper frontend view" }
            ]
        })
    });
    console.log("Status:", res.status);
    const data = await res.json();
    fs.writeFileSync("openrouter_response.json", JSON.stringify(data, null, 2));
}

testImage().catch(console.error);
