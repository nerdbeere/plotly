"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Droplets, TrendingUp } from "lucide-react";
import { SoilMoistureReading } from "@/lib/ha/types";

interface HistoryPoint {
  entityId: string;
  name: string;
  moisturePercent: number;
  recordedAt: string;
}

interface MoistureData {
  current: SoilMoistureReading[];
  history: HistoryPoint[];
}

function chartPoints(points: HistoryPoint[], entityId: string) {
  const values = points.filter((point) => point.entityId === entityId).slice().reverse();
  if (values.length < 2) return "";
  return values.map((point, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 100 - Math.min(100, Math.max(0, point.moisturePercent));
    return `${x},${y}`;
  }).join(" ");
}

export default function SoilMoisturePanel() {
  const [data, setData] = useState<MoistureData | null>(null);

  useEffect(() => {
    fetch("/api/ha/moisture").then((response) => response.json()).then(setData).catch(() => setData({ current: [], history: [] }));
  }, []);

  if (!data) return <div className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse" />;

  const drySensors = data.current.filter((reading) => reading.status === "dry");

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Telemetry</p>
          <h2 className="text-lg font-bold text-slate-900 mt-1">Soil moisture history</h2>
          <p className="text-xs text-slate-500 mt-1">Home Assistant readings from the last 7 days</p>
        </div>
        <TrendingUp className="w-6 h-6 text-blue-500" />
      </div>

      {drySensors.length > 0 && (
        <div className="mx-6 mt-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span><strong>{drySensors.map((sensor) => sensor.name).join(", ")}</strong> is below the 30% watering threshold.</span>
        </div>
      )}

      {data.current.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">No soil moisture sensors are configured. Add entity IDs in Settings.</p>
      ) : (
        <div className="grid gap-4 p-6 md:grid-cols-2">
          {data.current.map((sensor) => {
            const points = chartPoints(data.history, sensor.entity_id);
            return (
              <div key={sensor.entity_id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2"><Droplets className="w-4 h-4 text-blue-500" /><h3 className="font-semibold text-sm text-slate-900">{sensor.name}</h3></div>
                  <span className={`text-lg font-bold ${sensor.status === "dry" ? "text-amber-600" : sensor.status === "wet" ? "text-blue-600" : "text-emerald-600"}`}>{Math.round(sensor.moisturePercent)}%</span>
                </div>
                <div className="relative mt-4 h-28 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden">
                  <div className="absolute inset-x-0 top-[30%] border-t border-dashed border-amber-300" />
                  {points ? <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full p-2" aria-label={`${sensor.name} moisture graph`}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" className="text-blue-500" /></svg> : <p className="flex h-full items-center justify-center text-xs text-slate-400">Collecting history...</p>}
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-slate-400"><span>Dry &lt; 30%</span><span>{data.history.length ? "Latest readings" : "No history"}</span></div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
