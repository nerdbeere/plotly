"use client";

import React, { useEffect, useState } from "react";
import { Server, Key, Radio, Save, CheckCircle, RefreshCw, AlertTriangle, ShieldCheck, MapPin, Bell, Moon, Send } from "lucide-react";

export default function SettingsPage() {
  const [baseUrl, setBaseUrl] = useState("http://homeassistant.local:8123");
  const [token, setToken] = useState("");
  const [mockMode, setMockMode] = useState(true);
  const [weatherEntityId, setWeatherEntityId] = useState("weather.forecast_home");
  const [rainSensorEntityId, setRainSensorEntityId] = useState("binary_sensor.rain_sensor");
  const [moistureEntitiesStr, setMoistureEntitiesStr] = useState("sensor.soil_moisture_bed_1");
  const [moistureEntityLocations, setMoistureEntityLocations] = useState<Record<string, string>>({});
  const [gardenLocations, setGardenLocations] = useState<string[]>([]);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [notifyService, setNotifyService] = useState("persistent_notification");
  const [quietHoursStart, setQuietHoursStart] = useState(22);
  const [quietHoursEnd, setQuietHoursEnd] = useState(7);

  const moistureEntities = moistureEntitiesStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/ha/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setBaseUrl(data.config.baseUrl);
          setMockMode(data.config.mockMode);
          setWeatherEntityId(data.config.weatherEntityId);
          setRainSensorEntityId(data.config.rainSensorEntityId);
          setMoistureEntitiesStr((data.config.moistureEntities || []).join(", "));
          setMoistureEntityLocations(data.config.moistureEntityLocations || {});
          setNotifyEnabled(Boolean(data.config.notifyEnabled));
          setNotifyService(data.config.notifyService || "persistent_notification");
          setQuietHoursStart(Number(data.config.quietHoursStart ?? 22));
          setQuietHoursEnd(Number(data.config.quietHoursEnd ?? 7));
          if (data.config.hasToken) {
            setToken(data.config.token);
          }
        }
      })
      .finally(() => setLoading(false));

    fetch("/api/plants")
      .then((res) => res.json())
      .then((data) => {
        const locations = Array.from(new Set((data.myPlants || []).map((p: { location: string }) => p.location))) as string[];
        setGardenLocations(locations);
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/ha/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          token,
          mockMode,
          weatherEntityId,
          rainSensorEntityId,
          moistureEntities,
          moistureEntityLocations,
          notifyEnabled,
          notifyService,
          quietHoursStart,
          quietHoursEnd,
        }),
      });

      if (res.ok) {
        setStatusMsg({ text: "Home Assistant settings saved successfully!", type: "success" });
      } else {
        setStatusMsg({ text: "Failed to save settings.", type: "error" });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Network error", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Home Assistant Integration</h1>
        <p className="text-xs text-slate-500 mt-1">
          Connect your local Home Assistant instance to feed live weather forecasts, rain sensors, and soil moisture telemetry into your garden care engine.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border text-sm font-semibold ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          )}
          {statusMsg.text}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        {/* Mock Mode Toggle */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Radio className="w-5 h-5 text-emerald-600" />
            <div>
              <h4 className="font-semibold text-sm text-slate-900">Simulation / Mock Mode</h4>
              <p className="text-xs text-slate-500">
                Use built-in mock telemetry during autonomous development loops and testing without hitting live Home Assistant.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={mockMode}
              onChange={(e) => setMockMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Server URL */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Server className="w-4 h-4 text-slate-500" /> Home Assistant Base URL
          </label>
          <input
            type="url"
            required
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://192.168.1.XX:8123 or http://homeassistant.local:8123"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600 font-mono"
          />
        </div>

        {/* Access Token */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Key className="w-4 h-4 text-slate-500" /> Long-Lived Access Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600 font-mono"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Generate in Home Assistant: Profile → Long-Lived Access Tokens → Create Token.
          </p>
        </div>

        {/* Entity IDs Section */}
        <div className="border-t border-slate-100 pt-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900">Sensor & Forecast Entity Mappings</h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Weather Entity ID</label>
            <input
              type="text"
              value={weatherEntityId}
              onChange={(e) => setWeatherEntityId(e.target.value)}
              placeholder="weather.forecast_home"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Rain Sensor Entity ID</label>
            <input
              type="text"
              value={rainSensorEntityId}
              onChange={(e) => setRainSensorEntityId(e.target.value)}
              placeholder="binary_sensor.rain_sensor"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Soil Moisture Entity IDs (comma separated)
            </label>
            <input
              type="text"
              value={moistureEntitiesStr}
              onChange={(e) => setMoistureEntitiesStr(e.target.value)}
              placeholder="sensor.soil_moisture_bed_1, sensor.soil_moisture_bed_2"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600 font-mono"
            />
          </div>

          {moistureEntities.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500" />
                <h4 className="font-semibold text-sm text-slate-900">Moisture Sensor → Garden Location</h4>
              </div>
              <p className="text-xs text-slate-500">
                Map each sensor to a plant location. Watering tasks at the mapped location are postponed while the soil reads optimal/wet,
                and a watering suggestion appears on the dashboard when it reads dry. Unmapped sensors stay display-only.
              </p>
              {moistureEntities.map((entity) => (
                <div key={entity} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <span className="text-xs font-mono text-slate-600 sm:w-64 shrink-0 truncate" title={entity}>
                    {entity}
                  </span>
                  <select
                    value={moistureEntityLocations[entity] || ""}
                    onChange={(e) =>
                      setMoistureEntityLocations((current) => ({ ...current, [entity]: e.target.value }))
                    }
                    className="w-full sm:flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600 bg-white"
                  >
                    <option value="">— Not mapped (display only) —</option>
                    {gardenLocations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Section */}
        <div className="border-t border-slate-100 pt-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-slate-500" /> Notifications
          </h3>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Send className="w-5 h-5 text-emerald-600" />
              <div>
                <h4 className="font-semibold text-sm text-slate-900">Task Notifications</h4>
                <p className="text-xs text-slate-500">
                  Push due and overdue garden tasks to Home Assistant. One notification per task per day; quiet hours defer sends.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifyEnabled}
                onChange={(e) => setNotifyEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notify Service Target</label>
              <input
                type="text"
                value={notifyService}
                onChange={(e) => setNotifyService(e.target.value)}
                placeholder="persistent_notification or mobile_app_your_phone"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                HA notify target, without the “notify.” prefix. persistent_notification always works and shows in the HA sidebar.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-slate-500" /> Quiet Hours From (hour)
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={quietHoursStart}
                onChange={(e) => setQuietHoursStart(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quiet Hours Until (hour)</label>
              <input
                type="number"
                min="0"
                max="23"
                value={quietHoursEnd}
                onChange={(e) => setQuietHoursEnd(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            In mock mode, notifications are simulated locally instead of calling Home Assistant — no network calls are made.
          </p>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </form>
    </div>
  );
}
