import { memo } from 'react';

interface ConnectionStatusProps {
  stationId: string;
  isConnected: boolean;
  error: string | null;
}

export const ConnectionStatus = memo(function ConnectionStatus({
  stationId,
  isConnected,
  error
}: ConnectionStatusProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-bold tracking-tight">Live Wind Data for Station: {stationId}</h2>
      <div className={`px-4 py-2 rounded-md ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        {error && <div className="text-red-600 text-sm mt-1">Error: {error}</div>}
      </div>
    </div>
  );
});
