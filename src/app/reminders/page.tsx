"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Droplets, Sparkles, Plus, Calendar, Flower2, Clock, Bell } from "lucide-react";

interface TaskItem {
  id: number;
  userPlantId: number | null;
  title: string;
  taskType: string;
  dueDate: string;
  completed: number;
  completedAt: string | null;
  xpReward: number;
  lastNotifiedAt: string | null;
  lastNotifiedDate: string | null;
  plantName: string | null;
  plantLocation: string | null;
  areaName: string | null;
}

interface UserPlantSimple {
  id: number;
  customName: string;
}

export default function RemindersPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [plantsList, setPlantsList] = useState<UserPlantSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [rewardToast, setRewardToast] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState("water");
  const [selectedPlantId, setSelectedPlantId] = useState<string>("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [xpReward, setXpReward] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  const loadTasks = () => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTasks(data);
      })
      .finally(() => setLoading(false));

    fetch("/api/plants")
      .then((res) => res.json())
      .then((data) => {
        if (data.myPlants) setPlantsList(data.myPlants);
      });
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleComplete = async (taskId: number) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, { method: "POST" });
      const data = await res.json();
      if (data.earnedXp) {
        setRewardToast(`+${data.earnedXp} XP Earned! 🌟 (Streak: ${data.currentStreak} days)`);
        setTimeout(() => setRewardToast(null), 4000);
      }
      loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          taskType,
          userPlantId: selectedPlantId ? Number(selectedPlantId) : null,
          dueDate,
          xpReward: Number(xpReward),
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setTaskTitle("");
        loadTasks();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const pending = tasks.filter((t) => t.completed === 0);
  const completed = tasks.filter((t) => t.completed === 1);

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {rewardToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-emerald-500 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span className="font-semibold text-sm">{rewardToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Garden Reminders & Tasks</h1>
          <p className="text-xs text-slate-500 mt-1">Complete daily care tasks to level up and keep your streak alive</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="min-h-[44px] px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Custom Reminder
        </button>
      </div>

      {/* Pending Tasks */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> Pending Reminders ({pending.length})
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading reminders...</div>
          ) : pending.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              🎉 No pending tasks! All your plants are happy and watered.
            </div>
          ) : (
            pending.map((task) => (
              <div
                key={task.id}
                className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50 transition"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900">{task.title}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                      <span>{task.plantName || task.areaName || "General Care"}</span>
                      {task.plantLocation && <span>• {task.plantLocation}</span>}
                      <span>•</span>
                      <span className="text-emerald-600 font-semibold">Due: {task.dueDate}</span>
                      {task.lastNotifiedDate && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold"
                          title={`Last HA notification: ${task.lastNotifiedAt || task.lastNotifiedDate}`}
                        >
                          <Bell className="w-3 h-3" />
                          Notified {task.lastNotifiedDate === new Date().toISOString().split("T")[0] ? "today" : task.lastNotifiedDate}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> +{task.xpReward} XP
                  </span>
                  <button
                    onClick={() => handleComplete(task.id)}
                    className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 px-4 sm:px-3.5 py-2.5 sm:py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm sm:text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Complete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Completed History */}
      {completed.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Completed Tasks History
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {completed.map((task) => (
              <div key={task.id} className="p-4 flex items-center justify-between opacity-75">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h4 className="font-medium text-sm text-slate-700 line-through">{task.title}</h4>
                    <p className="text-xs text-slate-400">
                      {task.plantName} • Finished {task.completedAt?.split("T")[0]}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-400">+{task.xpReward} XP earned</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Create Reminder</h2>
            <p className="text-xs text-slate-500 mb-4">Add a custom task or reminder for your garden</p>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Fertilize Tomatoes"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Task Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600"
                  >
                    <option value="water">Watering</option>
                    <option value="fertilize">Fertilizing</option>
                    <option value="prune">Pruning</option>
                    <option value="harvest">Harvesting</option>
                    <option value="weed">Weeding</option>
                    <option value="custom">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Associated Plant (Optional)</label>
                <select
                  value={selectedPlantId}
                  onChange={(e) => setSelectedPlantId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600"
                >
                  <option value="">-- General Garden Task --</option>
                  {plantsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.customName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">XP Reward</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={xpReward}
                  onChange={(e) => setXpReward(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="min-h-[44px] px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  {submitting ? "Saving..." : "Create Reminder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
