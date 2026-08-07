import { useEffect, useState } from "react";
import { fetchDesignLabels, labelsToMap } from "@/lib/design-labels";

export function useDesignLabels(familySlug?: string) {
  const [labels, setLabels] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    if (!familySlug) { setLabels({}); return; }
    fetchDesignLabels(familySlug)
      .then((rows) => { if (!cancelled) setLabels(labelsToMap(rows)); })
      .catch(() => { if (!cancelled) setLabels({}); });
    return () => { cancelled = true; };
  }, [familySlug]);
  return labels;
}
