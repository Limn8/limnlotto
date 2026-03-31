import { LottoDashboard } from "@/components/lotto-dashboard";
import { buildNumberStats, getLottoDataset } from "@/lib/lotto";

export default function Home() {
  const dataset = getLottoDataset();
  const stats = buildNumberStats(dataset.draws);

  return (
    <LottoDashboard
      draws={dataset.draws}
      stats={stats}
      generatedAt={dataset.generatedAt}
    />
  );
}
