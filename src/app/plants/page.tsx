"use client";

import React, { useEffect, useState } from "react";
import { Sprout, Plus, MapPin, Calendar, Droplets, Sun, Sparkles, Check, RefreshCw, Pencil, Trash2, AlertTriangle } from "lucide-react";
import clsx from "clsx";

interface CatalogItem {
  id: string;
  name: string;
  scientificName: string;
  category: string;
  description: string;
  icon: string;
  waterIntervalDays: number;
  fertilizeIntervalDays: number;
  sunlight: string;
  difficulty: string;
}

interface UserPlantItem {
  id: number;
  plantId: string;
  customName: string;
  location: string;
  plantedAt: string;
  lastWateredAt: string | null;
  lastFertilizedAt: string | null;
  health: string;
  notes: string | null;
  catalogName: string;
  category: string;
  waterIntervalDays: number;
  fertilizeIntervalDays: number;
  sunlight: string;
  description: string;
  pendingTaskCount: number;
}

export default function PlantsPage() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [myPlants, setMyPlants] = useState<UserPlantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlant, setEditingPlant] = useState<UserPlantItem | null>(null);
  const [deletingPlant, setDeletingPlant] = useState<UserPlantItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [selectedPlantId, setSelectedPlantId] = useState("");
  const [customName, setCustomName] = useState("");
  const [location, setLocation] = useState("Raised Bed 1");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateResult, setRegenerateResult] = useState<string | null>(null);
  const [healthFilter, setHealthFilter] = useState<string | null>(null);

  const loadData = () => {
    const filter = new URLSearchParams(window.location.search).get("health");
    fetch("/api/plants")
      .then((res) => res.json())
      .then((data) => {
        setCatalog(data.catalog || []);
        setMyPlants(filter ? (data.myPlants || []).filter((plant: UserPlantItem) => plant.health === filter) : data.myPlants || []);
        if (data.catalog?.length > 0 && !selectedPlantId) {
          setSelectedPlantId(data.catalog[0].id);
          setCustomName(data.catalog[0].name);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const filter = new URLSearchParams(window.location.search).get("health");
    setHealthFilter(filter);
    loadData();
  }, []);

  const handlePlantSelect = (id: string) => {
    setSelectedPlantId(id);
    const item = catalog.find((p) => p.id === id);
    if (item) setCustomName(item.name);
  };

  const openAddModal = () => {
    setEditingPlant(null);
    setCustomName("");
    setLocation("Raised Bed 1");
    setNotes("");
    setShowModal(true);
  };

  const openEditModal = (plant: UserPlantItem) => {
    setEditingPlant(plant);
    setCustomName(plant.customName);
    setLocation(plant.location);
    setNotes(plant.notes || "");
    setShowModal(true);
  };

  const closeModals = () => {
    setShowModal(false);
    setEditingPlant(null);
    setDeletingPlant(null);
  };

  const handleEditPlant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlant || !customName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/plants/${editingPlant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customName, location, notes }),
      });
      if (res.ok) {
        closeModals();
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlant = async () => {
    if (!deletingPlant) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/plants/${deletingPlant.id}`, { method: "DELETE" });
      if (res.ok) {
        closeModals();
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleAddPlant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlantId || !customName) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/plants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantId: selectedPlantId, customName, location, notes }),
      });
      if (res.ok) {
        setShowModal(false);
        setNotes("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegenerateSchedule = async () => {
    setRegenerating(true);
    setRegenerateResult(null);
    try {
      const res = await fetch("/api/plants/regenerate-schedule", { method: "POST" });
      const data = await res.json();
      setRegenerateResult(
        res.ok
          ? `Schedule regenerated — ${data.created} new task${data.created === 1 ? "" : "s"} created.`
          : "Failed to regenerate schedule."
      );
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
      setRegenerateResult("Failed to regenerate schedule.");
    } finally {
      setRegenerating(false);
    }
  };

  const selectedCatalogItem = catalog.find((plant) => plant.id === selectedPlantId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Garden Plants</h1>
          <p className="text-xs text-slate-500 mt-1">Track growth, care schedules, and locations for all active plants</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {regenerateResult && (
            <span className="text-xs text-slate-500 sm:mr-2 self-center">{regenerateResult}</span>
          )}
          {myPlants.length > 0 && (
            <button
              onClick={handleRegenerateSchedule}
              disabled={regenerating}
              className="min-h-[44px] px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={clsx("w-4 h-4", regenerating && "animate-spin")} />
              {regenerating ? "Regenerating..." : "Regenerate schedule"}
            </button>
          )}
          <button
            onClick={openAddModal}
            className="min-h-[44px] px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Plant to Garden
          </button>
        </div>
      </div>

      {/* Plants Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading your garden...</div>
      ) : myPlants.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Sprout className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-800">Your garden is empty</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">Choose from the preset plant catalog to start tracking reminders.</p>
          <button
            onClick={openAddModal}
            className="min-h-[44px] px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Add Your First Plant
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myPlants.map((plant) => (
            <div
              key={plant.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between hover:border-emerald-300 transition"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {plant.category}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 mt-2">{plant.customName}</h3>
                    <p className="text-xs text-slate-500 italic">{plant.catalogName}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
                    <Sprout className="w-6 h-6" />
                  </div>
                </div>

                <div className="mt-5 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Location: <strong>{plant.location}</strong></span>
                  </div>
                   <div className="flex items-center gap-2">
                     <Droplets className="w-3.5 h-3.5 text-blue-500" />
                     <span>Water cycle: every <strong>{plant.waterIntervalDays} days</strong></span>
                   </div>
                   <div className="flex items-center gap-2">
                     <Sun className="w-3.5 h-3.5 text-amber-500" />
                     <span>Sunlight: <strong className="capitalize">{plant.sunlight.replace("_", " ")}</strong></span>
                   </div>
                   <div className="flex items-center gap-2">
                     <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                     <span>Feed cycle: every <strong>{plant.fertilizeIntervalDays} days</strong></span>
                   </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    <span>Planted: {plant.plantedAt}</span>
                  </div>
                </div>

                {plant.notes && (
                  <div className="mt-4 p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                    {plant.notes}
                  </div>
                )}
              </div>

              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                 <span className={clsx(
                   "font-semibold capitalize flex items-center gap-1",
                   plant.health === "needs_attention" ? "text-red-700" : plant.health === "thriving" ? "text-emerald-700" : "text-amber-700"
                 )}>
                   <span className={clsx("w-2 h-2 rounded-full", plant.health === "needs_attention" ? "bg-red-500" : plant.health === "thriving" ? "bg-emerald-500" : "bg-amber-500")} /> {plant.health.replace("_", " ")}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(plant)}
                    aria-label={`Edit ${plant.customName}`}
                    title="Edit plant"
                    className="flex items-center justify-center h-11 w-11 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setDeletingPlant(plant)}
                    aria-label={`Remove ${plant.customName}`}
                    title="Remove plant"
                    className="flex items-center justify-center h-11 w-11 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Plant Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {editingPlant ? `Edit ${editingPlant.customName}` : "Add Plant to Garden"}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              {editingPlant
                ? `Update nickname, location, or notes for this ${editingPlant.catalogName}`
                : "Select from standard presets or give it a custom nickname"}
            </p>

            <form onSubmit={editingPlant ? handleEditPlant : handleAddPlant} className="space-y-4">
              {!editingPlant && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Preset</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-xl">
                    {catalog.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => handlePlantSelect(c.id)}
                        className={clsx(
                          "p-2.5 rounded-lg text-left text-xs transition border flex flex-col justify-between",
                          selectedPlantId === c.id
                            ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold"
                            : "border-slate-100 hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span>{c.name}</span>
                          {selectedPlantId === c.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                        <span className="text-[10px] text-slate-500 capitalize">{c.category} • Every {c.waterIntervalDays}d</span>
                      </button>
                    ))}
                  </div>
                  {selectedCatalogItem && (
                    <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-950">
                      <p>{selectedCatalogItem.description}</p>
                      <p className="mt-1 text-emerald-700">
                        Care: water every {selectedCatalogItem.waterIntervalDays} days, feed every {selectedCatalogItem.fertilizeIntervalDays} days, and provide {selectedCatalogItem.sunlight.replace("_", " ")}.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Plant Nickname / Label</label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Bed</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Raised Bed 1, Balcony Pot"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Care tips, soil details..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModals}
                  className="min-h-[44px] px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  {editingPlant ? (submitting ? "Saving..." : "Save Changes") : submitting ? "Adding..." : "Add to Garden"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPlant && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-red-50 text-red-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Remove {deletingPlant.customName}?</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {deletingPlant.pendingTaskCount > 0
                    ? `${deletingPlant.pendingTaskCount} pending task${deletingPlant.pendingTaskCount === 1 ? " will be" : "s will be"} deleted along with all completed task history for this plant.`
                    : "This plant has no pending tasks. Its completed task history will be deleted."}
                </p>
                <p className="text-xs text-slate-500 mt-1">Your XP, level, streaks, and badges are not affected.</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-5 mt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={closeModals}
                className="min-h-[44px] px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePlant}
                disabled={deleting}
                className="min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-60"
              >
                {deleting ? "Removing..." : "Remove Plant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
