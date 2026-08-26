import { HAEntityState, GardenWeather, SoilMoistureReading } from "./types";

export function getMockWeather(): GardenWeather {
  const hour = new Date().getHours();
  // Simulate sunny during day, cool at night
  const temp = hour >= 9 && hour <= 18 ? 22.5 : 14.0;
  
  return {
    condition: "partlycloudy",
    temperature: temp,
    humidity: 58,
    precipitationForecastTomorrow: 2.4, // mm
    isRaining: false,
    isMock: true,
  };
}

export function getMockRainSensor(): HAEntityState {
  return {
    entity_id: "binary_sensor.rain_sensor",
    state: "off", // 'on' = raining, 'off' = dry
    attributes: {
      friendly_name: "Garden Rain Gauge Sensor",
      device_class: "moisture",
    },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  };
}

export function getMockSoilMoistures(): SoilMoistureReading[] {
  return [
    {
      entity_id: "sensor.soil_moisture_bed_1",
      name: "Main Vegetable Bed",
      moisturePercent: 42,
      status: "optimal",
    },
    {
      entity_id: "sensor.soil_moisture_balcony_pot",
      name: "Herb Patio Pot",
      moisturePercent: 28,
      status: "dry",
    },
  ];
}
