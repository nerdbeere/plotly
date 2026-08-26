"use client";

import React, { useEffect, useState } from "react";
import { Cloud, Sun, CloudRain, Droplets, Thermometer, Radio, CheckCircle, AlertCircle } from "lucide-react";
import { GardenWeather, SoilMoistureReading } from "@/lib/ha/types";

export default function WeatherWidget() {
  const [weather, setWeather] = useState<GardenWeather | null>(null);
  const [moistures, setMoistures] = useState<SoilMoistureReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ha/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.live) {
          setWeather(data.live.weather);
          setMoistures(data.live.moistures || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-16 bg-slate-100 rounded"></div>
      </div>
    );
  }

  const getWeatherIcon = (condition: string = "sunny") => {
    const c = condition.toLowerCase();
    if (c.includes("rain") || c.includes("pouring")) return <CloudRain className="w-8 h-8 text-blue-500" />;
    if (c.includes("cloud")) return <Cloud className="w-8 h-8 text-slate-500" />;
    return <Sun className="w-8 h-8 text-amber-500" />;
  };

  return (
    <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-2xl shadow-lg p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
        <div className="flex items-center space-x-3">
          {getWeatherIcon(weather?.condition)}
          <div>
            <h3 className="font-semibold text-lg text-emerald-100 capitalize">
              {weather?.condition.replace(/_/g, " ") || "Garden Conditions"}
            </h3>
            <p className="text-xs text-emerald-300/80 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              {weather?.isMock ? "Simulated Home Assistant Sensors (Mock Mode)" : "Live Home Assistant Sensor Feed"}
            </p>
          </div>
        </div>

        {/* Rain status badge */}
        <div className="flex items-center">
          {weather?.isRaining ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/40">
              <CloudRain className="w-3.5 h-3.5 text-blue-400 animate-bounce" />
              Rain Detected (Watering Skippable)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              No Rain Detected
            </span>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
          <div className="flex items-center text-xs text-emerald-300 mb-1">
            <Thermometer className="w-3.5 h-3.5 mr-1 text-amber-400" /> Temperature
          </div>
          <div className="text-xl font-bold">{weather?.temperature ?? 20}°C</div>
        </div>

        <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
          <div className="flex items-center text-xs text-emerald-300 mb-1">
            <Droplets className="w-3.5 h-3.5 mr-1 text-blue-400" /> Humidity
          </div>
          <div className="text-xl font-bold">{weather?.humidity ?? 50}%</div>
        </div>

        <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
          <div className="flex items-center text-xs text-emerald-300 mb-1">
            <CloudRain className="w-3.5 h-3.5 mr-1 text-sky-400" /> Rain Forecast
          </div>
          <div className="text-xl font-bold">{weather?.precipitationForecastTomorrow ?? 0} mm</div>
        </div>

        <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
          <div className="flex items-center text-xs text-emerald-300 mb-1">
            <Droplets className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Soil Moisture
          </div>
          <div className="text-xl font-bold">
            {moistures.length > 0 ? `${moistures[0].moisturePercent}%` : "Optimal"}
          </div>
        </div>
      </div>
    </div>
  );
}
