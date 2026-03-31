import Link from "next/link";

import { StoreHotspotMap } from "@/components/store-hotspot-map";
import {
  buildWinningStoreHotspots,
  formatKoreanDate,
  getWinningStoreDataset,
} from "@/lib/lotto";

export default function StoresPage() {
  const dataset = getWinningStoreDataset();
  const hotspots = buildWinningStoreHotspots(dataset.draws);
  const topHotspots = hotspots.slice(0, 8);

  return (
    <div className="page-shell">
      <section className="hero-panel small">
        <div className="hero-copy">
          <p className="eyebrow">로또 명당 지도</p>
          <h1>1등 당첨 매장이 어디에 몰렸는지 남한 지도 위에서 한눈에 봅니다</h1>
          <p>
            1등 배출점의 위도·경도를 남한 배경 위에 점으로 찍었습니다. 같은 곳에서 여러 번
            당첨이 나오면 점이 조금씩 더 커지고 색도 더 뜨거워집니다. 온라인 판매점처럼
            실제 오프라인 매장이 아닌 항목은 지도에서 제외했습니다.
          </p>
          <div className="hero-meta">
            <span>262회부터 제공된 데이터</span>
            <span>업데이트 {formatKoreanDate(dataset.generatedAt)}</span>
            <span>최신 수록 회차 {dataset.latestDrawNo}회</span>
          </div>
        </div>
        <div className="hero-side">
          <Link href="/" className="inline-link">
            메인 대시보드로 돌아가기
          </Link>
        </div>
      </section>

      <section className="surface-panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">핫스팟 분포</p>
            <h2>로또 1등 배출점 지도</h2>
          </div>
          <p className="section-copy">
            동일한 매장이 여러 번 1등을 배출한 경우 점의 크기를 완만하게 키우고, 색도
            파랑에서 주황, 빨강 계열로 점점 뜨겁게 바꿨습니다. 점은 반투명하게 두어
            겹치는 구간이 보이도록 했습니다.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
          <StoreHotspotMap hotspots={hotspots} />

          <div className="space-y-4">
            <div className="overview-card">
              <p>데이터 범위</p>
              <strong>{dataset.draws.length}개 회차</strong>
              <p>262회부터 {dataset.latestDrawNo}회까지의 오프라인 1등 배출점만 반영</p>
            </div>
            <div className="overview-card">
              <p>중복 명당 수</p>
              <strong>{hotspots.filter((spot) => spot.hitCount >= 2).length}곳</strong>
              <p>같은 위치에서 2회 이상 1등이 나온 매장 수</p>
            </div>
            <div className="analysis-box">
              <h2>반복 당첨 상위 매장 분포</h2>
              <ul className="analysis-list">
                {topHotspots.map((spot) => (
                  <li key={`top-${spot.key}`}>
                    <span>반복 당첨 {spot.hitCount}회</span>
                    <strong>{spot.draws.at(-1)}회 최근 기록</strong>
                  </li>
                ))}
              </ul>
            </div>
            <p className="disclaimer">
              262회부터 제공된 정보만 반영했습니다. 매장명과 상세 주소는 지도에 노출하지
              않고, 위치 분포를 거칠게 보는 용도로만 사용했습니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
