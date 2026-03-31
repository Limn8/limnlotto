"use client";

import { useMemo, useRef, useState } from "react";

import type { WinningStoreSpot } from "@/lib/lotto";

const WIDTH = 760;
const HEIGHT = 956;
const MAP_IMAGE_FRAME = {
  x: 94,
  y: 50,
  width: 520,
  height: 756,
};
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
    x: 92 + xRatio * (WIDTH - 198),
    y: 118 + yRatio * (HEIGHT - 262),
  };
}

function hotspotFill(hitCount: number) {
  if (hitCount >= 20) return "#d62828";
  if (hitCount >= 15) return "#f97316";
  if (hitCount >= 11) return "#facc15";
  if (hitCount >= 6) return "#7c3aed";
  return "#2563eb";
}

function hotspotRadius(hitCount: number) {
  return Math.min(10.5, 1.75 + Math.sqrt(hitCount) * 1.02);
}

type StoreHotspotMapProps = {
  hotspots: WinningStoreSpot[];
};

export function StoreHotspotMap({ hotspots }: StoreHotspotMapProps) {
  const [zoom, setZoom] = useState(1);
  const [hoveredSpot, setHoveredSpot] = useState<{ hitCount: number; x: number; y: number } | null>(
    null,
  );
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const layeredHotspots = useMemo(
    () => [...hotspots].sort((left, right) => left.hitCount - right.hitCount),
    [hotspots],
  );
  const maxHitCount = Math.max(...hotspots.map((spot) => spot.hitCount), 1);

  function updateTooltipPosition(clientX: number, clientY: number, hitCount: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();

    setHoveredSpot({
      hitCount,
      x: clientX - rect.left + 12,
      y: clientY - rect.top - 10,
    });
  }

  return (
    <div className="store-map-panel">
      <div className="store-map-toolbar">
        <span>지도 확대/축소</span>
        <div className="store-map-controls">
          <button
            type="button"
            className="store-map-button"
            onClick={() => setZoom((current) => Math.max(0.85, Number((current - 0.15).toFixed(2))))}
          >
            -
          </button>
          <button
            type="button"
            className="store-map-button"
            onClick={() => setZoom(1)}
          >
            100%
          </button>
          <button
            type="button"
            className="store-map-button"
            onClick={() => setZoom((current) => Math.min(2.2, Number((current + 0.15).toFixed(2))))}
          >
            +
          </button>
        </div>
      </div>

      <div ref={viewportRef} className="store-map-viewport">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="store-map-svg"
          role="img"
          aria-label="대한민국 1등 배출점 지도"
          style={{ transform: `scale(${zoom})`, transformOrigin: "50% 50%" }}
        >
          <image
            href="/south-korea-reference-map.jpg"
            x={MAP_IMAGE_FRAME.x}
            y={MAP_IMAGE_FRAME.y}
            width={MAP_IMAGE_FRAME.width}
            height={MAP_IMAGE_FRAME.height}
            preserveAspectRatio="none"
            className="korea-reference-map"
          />

          {layeredHotspots.map((spot) => {
            const point = projectToMap(spot.lat, spot.lng);
            const radius = hotspotRadius(spot.hitCount);

            return (
              <g key={spot.key}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius + 1.5}
                  className="store-hotspot-glow"
                  style={{ opacity: Math.min(0.1 + spot.hitCount / maxHitCount / 4.5, 0.22) }}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius}
                  fill={hotspotFill(spot.hitCount)}
                  className="store-hotspot"
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={Math.max(radius + 6, 12)}
                  className="store-hotspot-hitbox"
                  onPointerEnter={(event) =>
                    updateTooltipPosition(event.clientX, event.clientY, spot.hitCount)
                  }
                  onPointerMove={(event) =>
                    updateTooltipPosition(event.clientX, event.clientY, spot.hitCount)
                  }
                  onPointerLeave={() => setHoveredSpot(null)}
                />
              </g>
            );
          })}
        </svg>

        {hoveredSpot ? (
          <div
            className="store-map-tooltip"
            style={{ left: hoveredSpot.x, top: hoveredSpot.y }}
          >
            {hoveredSpot.hitCount}회 당첨
          </div>
        ) : null}
      </div>
    </div>
  );
}
