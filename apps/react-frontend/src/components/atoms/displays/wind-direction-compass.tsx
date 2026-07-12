import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Compass, Info } from 'lucide-react';
import React from 'react';

import { WIND_DIRECTIONS } from '../../../lib/wind-utils';

interface WindDirectionCompassProps {
  windDirection: number | null | undefined;
  stale?: boolean;
}

const CENTER = 100;
const FACE_RADIUS = 96;

// Favorable cross-shore sector for Vasiliki: westerly winds around 270°
const FAVORABLE_START = 245;
const FAVORABLE_END = 295;

// 0° points north (up); angles grow clockwise like compass bearings
function polarPoint(radius: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function sectorPath(startDeg: number, endDeg: number, radius: number): string {
  const start = polarPoint(radius, startDeg);
  const end = polarPoint(radius, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export const WindDirectionCompass: React.FC<WindDirectionCompassProps> = ({
  windDirection,
  stale = false,
}) => {
  const hasDirection = windDirection !== null && windDirection !== undefined;

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <Compass className="card-foreground h-5 w-5" />
        <h3 className="card-foreground text-2xl font-bold">Current Wind Direction</h3>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          The arrow shows the direction from which the wind blows. For optimal Vasiliki conditions,
          we look for westerly winds (the highlighted sector around 270°).
        </AlertDescription>
      </Alert>

      <div className={`flex justify-center px-2 ${stale ? 'opacity-50' : ''}`}>
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md">
          <svg
            viewBox="0 0 200 200"
            className="h-auto w-full"
            role="img"
            aria-label={
              hasDirection
                ? `Compass showing wind from ${Math.round(windDirection)} degrees`
                : 'Compass with no wind direction data'
            }
          >
            {/* Face */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={FACE_RADIUS}
              fill="none"
              stroke="var(--border)"
              strokeWidth="2"
            />

            {/* Favorable westerly sector */}
            <path
              d={sectorPath(FAVORABLE_START, FAVORABLE_END, FACE_RADIUS)}
              fill="var(--primary)"
              fillOpacity="0.12"
            />

            {/* Tick marks, larger at the cardinal points */}
            {Array.from({ length: 16 }, (_, i) => {
              const angle = i * 22.5;
              const major = i % 4 === 0;
              const outer = polarPoint(FACE_RADIUS, angle);
              const inner = polarPoint(major ? 84 : 90, angle);
              return (
                <line
                  key={angle}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="var(--border)"
                  strokeWidth={major ? 2.5 : 1.5}
                />
              );
            })}

            {/* Cardinal letters */}
            {(['N', 'E', 'S', 'W'] as const).map((label, i) => {
              const pos = polarPoint(70, i * 90);
              return (
                <text
                  key={label}
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="14"
                  fontWeight="600"
                  fill="var(--muted-foreground)"
                >
                  {label}
                </text>
              );
            })}

            {/* Needle pointing to where the wind comes from */}
            <g
              style={{
                transform: `rotate(${hasDirection ? windDirection : 0}deg)`,
                transformOrigin: '100px 100px',
                transition: 'transform 0.3s ease-out',
                opacity: hasDirection ? 1 : 0,
              }}
            >
              <polygon points="100,18 91,106 100,94 109,106" fill="var(--primary)" />
            </g>
            <circle cx={CENTER} cy={CENTER} r="5" fill="var(--foreground)" />
          </svg>
        </div>
      </div>

      <div className={`text-primary text-center text-5xl font-bold ${stale ? 'opacity-50' : ''}`}>
        {hasDirection ? `${Math.round(windDirection)}°` : '---'}
      </div>

      {hasDirection && (
        <div className="px-2 text-center">
          <Badge variant="outline" className="text-sm">
            {WIND_DIRECTIONS[Math.round(windDirection / 22.5) % 16] ?? 'N'}
          </Badge>
        </div>
      )}
    </div>
  );
};
