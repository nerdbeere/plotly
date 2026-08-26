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
}

export interface SoilMoistureReading {
  entity_id: string;
  name: string;
  moisturePercent: number;
  status: "dry" | "optimal" | "wet";
}
