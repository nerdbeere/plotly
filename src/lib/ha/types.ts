export interface HAEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface GardenWeather {
  condition: string; // sunny, rainy, cloudy, partlycloudy, etc.
  temperature: number; // in Celsius
  humidity: number; // percentage
  precipitationForecastTomorrow: number; // in mm
  isRaining: boolean;
  isMock: boolean;
  /** True when mock mode is off but no live data could be fetched. */
  unavailable?: boolean;
}

export interface SoilMoistureReading {
  entity_id: string;
  name: string;
  moisturePercent: number;
  status: "dry" | "optimal" | "wet";
}

export interface MoistureSuggestion {
  entityId: string;
  sensorName: string;
  location: string;
  plantId: number | null;
  plantName: string | null;
  hasOpenTask: boolean;
}
