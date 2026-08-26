"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import WeatherWidget from "@/components/WeatherWidget";
import SoilMoisturePanel from "@/components/SoilMoisturePanel";
import { CheckCircle2, Clock, Plus, ArrowRight, Sparkles, Droplets, Flame, Leaf, Trophy, LockKeyhole } from "lucide-react";

const badgeIcons = { leaf: Leaf, flame: Flame, trophy: Trophy };

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof badgeIcons;
  earned: boolean;
}

interface TaskItem {
  id: number;
  title: string;
  taskType: string;
  dueDate: string;
  completed: number;
  xpReward: number;
  plantName: string | null;
  plantLocation: string | null;
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rewardToast, setRewardToast] = useState<string | null>(null);
  const [badges, setBadges] = useState<BadgeItem[]>([]);

  const fetchTasks = () => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTasks(data);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
    fetch("/api/gamification")
      .then((res) => res.json())
      .then((data) => setBadges(Array.isArray(data.badges) ? data.badges : []))
      .catch(() => {});
  }, []);

  const handleComplete = async (taskId: number) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, { method: "POST" });
      const data = await res.json();
      if (data.earnedXp) {
        setRewardToast(`+${data.earnedXp} XP earned. Current streak: ${data.currentStreak} days`);
        setTimeout(() => setRewardToast(null), 4000);
      }
      const gamificationRes = await fetch("/api/gamification");
      const gamificationData = await gamificationRes.json();
      if (Array.isArray(gamificationData.badges)) {
        const newlyEarned = gamificationData.badges.find(
          (badge: BadgeItem) => badge.earned && !badges.some((current) => current.id === badge.id && current.earned)
        );
        if (newlyEarned) {
          setRewardToast(`${newlyEarned.name} unlocked!`);
          setTimeout(() => setRewardToast(null), 4000);
        }
        setBadges(gamificationData.badges);
      }
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const pendingTasks = tasks.filter((t) => t.completed === 0);
  const completedTasks = tasks.filter((t) => t.completed === 1);

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {rewardToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-emerald-500 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span className="font-semibold text-sm">{rewardToast}</span>
        </div>
      )}

      {/* Hero / Sensor Overview */}
      <WeatherWidget />
      <SoilMoisturePanel />

      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Milestones</p>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Your achievement shelf</h2>
          </div>
          <Trophy className="w-6 h-6 text-amber-500" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
          {badges.map((badge) => {
            const Icon = badgeIcons[badge.icon];
            return (
              <div key={badge.id} className={`relative rounded-xl border p-4 transition ${badge.earned ? "border-amber-200 bg-amber-50 badge-unlock" : "border-slate-200 bg-slate-50 opacity-65"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${badge.earned ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-400"}`}>
                  {badge.earned ? <Icon className="w-5 h-5" /> : <LockKeyhole className="w-5 h-5" />}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{badge.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{badge.description}</p>
                <span className={`inline-block mt-3 text-[11px] font-semibold uppercase tracking-wide ${badge.earned ? "text-amber-700" : "text-slate-400"}`}>
                  {badge.earned ? "Unlocked" : "Locked"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Action & Stat Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Reminders</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{pendingTasks.length}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tasks Completed</p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-1">{completedTasks.length}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <Link
          href="/plants"
          className="bg-emerald-700 hover:bg-emerald-800 transition text-white p-5 rounded-xl shadow-xs flex items-center justify-between group"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Garden Management</p>
            <h3 className="text-lg font-bold mt-1 flex items-center gap-1">
              Add New Plant <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </h3>
          </div>
          <div className="p-3 bg-emerald-600 rounded-xl">
            <Plus className="w-6 h-6" />
          </div>
        </Link>
      </div>

      {/* Task List Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Today's Garden Tasks</h2>
            <p className="text-xs text-slate-500 mt-0.5">Complete reminders to earn XP and maintain your daily streak</p>
          </div>
          <Link
            href="/reminders"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading garden tasks...</div>
          ) : pendingTasks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex p-4 rounded-full bg-emerald-50 text-emerald-600 mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">All garden tasks completed for today!</h3>
              <p className="text-xs text-slate-500 mt-1">Your plants are well taken care of. Check back tomorrow.</p>
            </div>
          ) : (
            pendingTasks.map((task) => (
              <div
                key={task.id}
                className="p-5 flex items-center justify-between hover:bg-slate-50/80 transition"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900">{task.title}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{task.plantName || "Garden Bed"}</span>
                      {task.plantLocation && (
                        <>
                          <span>•</span>
                          <span>{task.plantLocation}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-emerald-600 font-medium">Due: {task.dueDate}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> +{task.xpReward} XP
                  </span>
                  <button
                    onClick={() => handleComplete(task.id)}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Complete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
