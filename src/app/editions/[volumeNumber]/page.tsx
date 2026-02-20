import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * /editions/0 and /editions/1 etc. → show that volume.
 * 0 is treated as volume 1 (first edition).
 */
export default async function EditionByVolumePage({
  params,
}: {
  params: Promise<{ volumeNumber: string }>;
}) {
  const { volumeNumber } = await params;
  const vol = volumeNumber.trim();
  const num = /^\d+$/.test(vol) ? Math.max(1, parseInt(vol, 10)) : 1;
  redirect(`/edition/${num}`);
}
