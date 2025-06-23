import React from 'react';

interface UnitSelectorProps {
  selectedUnit: string;
  onUnitChange: (unit: string) => void;
  className?: string;
}

export function UnitSelector({ selectedUnit, onUnitChange, className = '' }: UnitSelectorProps) {
  const handleUnitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onUnitChange(event.target.value);
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 hover:shadow-2xl transition-shadow duration-300 ${className}`}>
      <div className="text-center">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Wind Speed Units
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Choose your preferred measurement unit
          </p>
        </div>
        
        <div className="relative">
          <select
            id="unit-select"
            value={selectedUnit}
            onChange={handleUnitChange}
            className="w-full max-w-xs mx-auto px-6 py-4 text-base font-medium border-2 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl shadow-sm bg-white dark:bg-slate-700 dark:text-white transition-all duration-200 hover:border-blue-400 cursor-pointer appearance-none"
          >
            <option value="m/s">m/s (Meters per second)</option>
            <option value="km/h">km/h (Kilometers per hour)</option>
            <option value="knots">Knots (Nautical miles per hour)</option>
            <option value="beaufort">Beaufort Scale</option>
            
          </select>
          
        </div>
      </div>
    </div>
  );
}
