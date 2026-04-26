"use client";

import { useEffect, useState } from "react";

type Props = {
  articleId: string;
};

export function LiveReaderCount({ articleId }: Props) {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const es = new EventSource(`/api/events/readers?articleId=${encodeURIComponent(articleId)}`);

    es.onmessage = (e) => {
      const n = parseInt(e.data, 10);
      if (!isNaN(n)) setCount(n);
    };

    return () => es.close();
  }, [articleId]);

  if (count <= 1) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      {count} reading now
    </span>
  );
}
