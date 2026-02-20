async function run() {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  const data = await res.json();
  const freeModels = data.data.filter((m: any) => parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0);
  console.log("Free models (sample):", freeModels.map((m: any) => m.id).slice(0, 30));
  const freeImages = freeModels.filter((m: any) => m.architecture?.modality?.includes("image"));
  console.log("Free image models:", freeImages.map((m: any) => m.id));
}
run();
