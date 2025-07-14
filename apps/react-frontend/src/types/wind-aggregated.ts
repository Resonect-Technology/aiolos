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

export interface WindAggregated10Min {
  timestamp: string;
  avgSpeed: number;
  minSpeed: number;
  maxSpeed: number;
  dominantDirection: number;
  tendency: 'increasing' | 'decreasing' | 'stable';
}

export interface WindAggregatedResponse {
  stationId: string;
  date: string;
  interval: string;
  unit?: string;
  data: WindAggregated1Min[] | WindAggregated10Min[];
  totalRecords: number;
}

export interface WindAggregatedLatestResponse {
  stationId: string;
  timestamp: string;
  avgSpeed: number;
  minSpeed: number;
  maxSpeed: number;
  dominantDirection: number;
  sampleCount?: number;
  tendency?: 'increasing' | 'decreasing' | 'stable';
  interval: string;
}