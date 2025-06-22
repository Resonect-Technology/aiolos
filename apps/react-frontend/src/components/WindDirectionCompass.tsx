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
    <div className="flex flex-col items-center bg-background p-4 rounded-lg">
      <h2 className="text-xl font-semibold text-primary-content mb-2">Wind Direction</h2>
      <p className="text-sm text-muted-foreground mb-4">
        The red arrow shows the direction from which the wind blows. For good
        Vasiliki wind we&apos;re looking for W direction (around 270&deg;).
      </p>
      <div className="compass"> {/* Class from user's CSS */}
        <div className="arrow" /> {/* Class from user's CSS */}
        <div
          className="compass-circle" /* Class from user's CSS */
          style={{ transform: compassCircleTransformStyle }}
        />
        <div className="my-point" /> {/* Class from user's CSS */}
      </div>
      <div className="text-neutral mt-4 text-lg">
        Direction:{" "}
        {windDirection !== null && windDirection !== undefined
          ? `${Math.round(windDirection)}°`
          : "Loading..."}
      </div>
    </div>
  );
};
