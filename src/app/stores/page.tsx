import Link from "next/link";

import {
  buildWinningStoreHotspots,
  formatKoreanDate,
  getWinningStoreDataset,
} from "@/lib/lotto";

const WIDTH = 760;
const HEIGHT = 900;
const BOUNDS = {
  minLat: 33.0,
  maxLat: 38.7,
  minLng: 124.5,
  maxLng: 131.0,
};

function projectToMap(lat: number, lng: number) {
  const xRatio = (lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng);
  const yRatio = 1 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat);

  return {
    x: 70 + xRatio * (WIDTH - 140),
    y: 50 + yRatio * (HEIGHT - 110),
  };
}

function hotspotFill(hitCount: number) {
  if (hitCount >= 5) return "#b91c1c";
  if (hitCount >= 4) return "#dc2626";
  if (hitCount >= 3) return "#ea580c";
  if (hitCount >= 2) return "#f59e0b";
  return "#2563eb";
}

export default function StoresPage() {
  const dataset = getWinningStoreDataset();
  const hotspots = buildWinningStoreHotspots(dataset.draws);
  const topHotspots = hotspots.slice(0, 8);
  const maxHitCount = Math.max(...hotspots.map((spot) => spot.hitCount), 1);

  return (
    <div className="page-shell">
      <section className="hero-panel small">
        <div className="hero-copy">
          <p className="eyebrow">로또 명당 지도</p>
          <h1>1등 당첨 매장이 어디에 몰렸는지 남한 지도 위에서 한눈에 봅니다</h1>
          <p>
            1등 배출점의 위도·경도를 남한 배경 위에 점으로 찍었습니다. 같은 곳에서 여러 번
            당첨이 나오면 점이 더 커지고 색도 더 뜨거워집니다.
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
            동일한 매장이 여러 번 1등을 배출한 경우 점의 크기를 1회당 1씩 키우고, 색도
            파랑에서 주황, 빨강 계열로 점점 뜨겁게 바꿨습니다.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
          <div className="store-map-panel">
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="store-map-svg"
              role="img"
              aria-label="대한민국 1등 배출점 지도"
            >
              <path
                className="korea-silhouette"
                d="M287 69c31 7 65 27 88 52 26 28 44 66 41 105-3 40-23 71-23 108 0 29 23 47 40 71 26 37 41 90 26 133-15 43-58 68-76 108-15 34-4 80-27 111-23 32-71 47-110 44-42-3-84-27-116-55-28-24-52-57-60-94-9-38 0-82-20-116-18-31-57-49-72-83-20-45-9-102 19-142 18-26 47-45 60-74 12-25 5-54 7-81 5-69 57-131 120-161 29-14 73-28 103-26z"
              />
              <path
                className="korea-shadow-line"
                d="M409 146c-17 25-26 58-24 89 2 34 19 61 36 89 23 39 35 95 11 137-22 38-64 60-84 98-16 29-14 69-37 94"
              />
              <path
                className="korea-shadow-line"
                d="M250 162c-24 31-39 68-41 107-3 53 17 102 41 149 25 50 56 100 62 156"
              />

              {hotspots.map((spot) => {
                const point = projectToMap(spot.lat, spot.lng);
                const radius = 4 + spot.hitCount;

                return (
                  <g key={spot.key}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={radius + 4}
                      className="store-hotspot-glow"
                      style={{ opacity: Math.min(spot.hitCount / maxHitCount, 0.55) }}
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={radius}
                      fill={hotspotFill(spot.hitCount)}
                      className="store-hotspot"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="space-y-4">
            <div className="overview-card">
              <p>데이터 범위</p>
              <strong>{dataset.draws.length}개 회차</strong>
              <p>262회부터 {dataset.latestDrawNo}회까지의 1등 배출점만 반영</p>
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
