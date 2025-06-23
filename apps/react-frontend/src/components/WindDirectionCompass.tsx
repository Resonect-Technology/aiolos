import React, { useState, useEffect } from 'react';
import './WindDirectionCompass.css'; // Uses the CSS provided by the user

interface WindDirectionCompassProps {
  windDirection: number | null | undefined;
}

export const WindDirectionCompass: React.FC<WindDirectionCompassProps> = ({ windDirection }) => {
  const [compassCircleTransformStyle, setCompassCircleTransformStyle] = useState(
    "translate(-50%, -50%)"
  );

  useEffect(() => {
    if (windDirection !== null && windDirection !== undefined) {
      const rotation = 360 - windDirection;
      const transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
      setCompassCircleTransformStyle(transform);
    } else {
      setCompassCircleTransformStyle("translate(-50%, -50%)");
    }
  }, [windDirection]);

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Wind Direction</h2>
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
          The red arrow shows the direction from which the wind blows. For optimal 
          Vasiliki conditions, we look for westerly winds (around 270°).
        </p>
      </div>
      
      <div className="flex justify-center mb-6">
        <div className="compass"> {/* Class from user's CSS */}
          <div className="arrow" /> {/* Class from user's CSS */}
          <div
            className="compass-circle" /* Class from user's CSS */
            style={{ transform: compassCircleTransformStyle }}
          />
          <div className="my-point" /> {/* Class from user's CSS */}
        </div>
      </div>
      
      <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
        <div className="text-center">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-1">
            Current Direction
          </span>
          <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            {windDirection !== null && windDirection !== undefined
              ? `${Math.round(windDirection)}°`
              : "---"}
          </span>
          {windDirection !== null && windDirection !== undefined && (
            <span className="text-sm text-slate-500 dark:text-slate-400 block mt-1">
              {getCompassDirection(windDirection)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to convert degrees to compass direction
function getCompassDirection(degrees: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};
