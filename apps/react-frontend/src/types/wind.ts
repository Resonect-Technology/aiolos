/**
 * Live wind reading from the `wind/live/:station_id` SSE channel.
 *
 * gustSpeed/minSpeed are the station's max/min 3 s rolling means; intervalMs
 * is the effective send interval the reading was produced under (used to
 * derive the staleness threshold at any configured cadence). All three are
 * absent on payloads from pre-gust firmware.
 */
export interface WindData {
  windSpeed: number;
  windDirection: number;
  gustSpeed?: number;
  minSpeed?: number;
  intervalMs?: number;
  timestamp: string;
}
