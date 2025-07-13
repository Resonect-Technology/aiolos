/**
 * Types for aggregated wind data
 */
export interface WindAggregated1Min {
  timestamp: string;
  avgSpeed: number;
  minSpeed: number;
  maxSpeed: number;
  dominantDirection: number;
  sampleCount: number;
}

export interface WindAggregatedResponse {
  stationId: string;
  date: string;
  interval: string;
  unit?: string;
  data: WindAggregated1Min[];
  totalRecords: number;
}

export interface WindAggregatedLatestResponse {
  stationId: string;
  timestamp: string;
  avgSpeed: number;
  minSpeed: number;
  maxSpeed: number;
  dominantDirection: number;
  sampleCount: number;
}