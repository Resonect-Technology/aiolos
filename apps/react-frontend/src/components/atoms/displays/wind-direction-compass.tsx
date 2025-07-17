import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Compass, Info, ChevronsDown } from "lucide-react";
import "../../wind-direction-compass.css"; // Uses the CSS provided by the user

interface WindDirectionCompassProps {
  windDirection: number | null | undefined;
}

export const WindDirectionCompass: React.FC<WindDirectionCompassProps> = ({ windDirection }) => {
  const [compassCircleTransformStyle, setCompassCircleTransformStyle] =
    useState("translate(-50%, -50%)");

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
    <div className="text-center space-y-4">
      <div className="flex items-center justify-center gap-2">
        <Compass className="h-5 w-5 card-foreground" />
        <h3 className="text-2xl font-bold card-foreground">Current Wind Direction</h3>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          The arrow shows the direction from which the wind blows. For optimal Vasiliki
          conditions, we look for westerly winds (around 270°).
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <ChevronsDown className="w-16 h-16 text-primary" />
      </div>

      <div className="flex justify-center px-2">
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-3/4 xl:max-w-3/4">
          <div
            className="compass"
            style={{
              width: '100%',
              height: 'auto',
              aspectRatio: '1 / 1'
            }}
          >
            <div
              className="compass-circle"
              style={{ transform: compassCircleTransformStyle }}
            />
            <div className="my-point" />
          </div>
        </div>
      </div>

      <div className="text-5xl font-bold text-center text-primary">
        {windDirection !== null && windDirection !== undefined
          ? `${Math.round(windDirection)}°`
          : "---"}
      </div>

      {windDirection !== null && windDirection !== undefined && (
        <div className="text-center px-2">
          <Badge variant="outline" className="text-sm">
            {getCompassDirection(windDirection)}
          </Badge>
        </div>
      )}
    </div>
  );
};

// Helper function to convert degrees to compass direction
function getCompassDirection(degrees: number): string {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}
