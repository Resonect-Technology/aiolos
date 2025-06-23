import React from 'react';

interface UnitSelectorProps {
  selectedUnit: string;
  onUnitChange: (unit: string) => void;
}

export function UnitSelector({ selectedUnit, onUnitChange }: UnitSelectorProps) {
  const handleUnitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onUnitChange(event.target.value);
  };

  return (
    <div className="flex flex-col items-center p-4 rounded-lg">
      <label htmlFor="unit-select" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
        Select Units:
      </label>
      <select
        id="unit-select"
        value={selectedUnit}
        onChange={handleUnitChange}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
      >
        <option value="m/s">m/s</option>
        <option value="km/h">km/h</option>
        <option value="knots">knots</option>
        <option value="beaufort">Beaufort</option>
      </select>
    </div>
  );
}
