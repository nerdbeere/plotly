"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Sparkles, Sprout } from "lucide-react";

interface GameState {
  level: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
}

export default function Header() {
  const [stats, setStats] = useState<GameState>({
    level: 1,
    totalXp: 50,
    currentStreak: 1,
    longestStreak: 1,
    currentLevelXp: 50,
    nextLevelXp: 100,
    progressPercent: 50,
  });

  useEffect(() => {
    fetch("/api/gamification")
      .then((res) => res.json())
      .then((data) => {
        if (data.level) setStats(data);
      })
      .catch(() => {});
  }, []);

  return (
    <header className="bg-emerald-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="p-2 bg-emerald-700 rounded-lg group-hover:bg-emerald-600 transition">
              <Sprout className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">GardenPlot</span>
              <span className="text-xs block text-emerald-300 font-medium">Smart Garden Assistant</span>
            </div>
          </Link>

          {/* Gamification Status Bar */}
          <div className="flex items-center space-x-4 sm:space-x-6">
            {/* Streak Counter */}
            <div className="flex items-center space-x-1.5 bg-emerald-900/60 px-3 py-1.5 rounded-full border border-emerald-700/50">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
              <span className="font-bold text-sm text-amber-300">{stats.currentStreak}</span>
              <span className="text-xs text-emerald-200 hidden sm:inline">day streak</span>
            </div>

            {/* Level & XP Progress */}
            <div className="flex flex-col items-end min-w-0">
              <div className="flex items-center space-x-1 text-xs text-emerald-200 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="font-semibold text-white">Level {stats.level}</span>
                <span className="text-emerald-400 hidden min-[420px]:inline">({stats.totalXp} XP)</span>
              </div>
              <div className="w-20 sm:w-36 bg-emerald-950 rounded-full h-2 overflow-hidden border border-emerald-700">
                <div
                  className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
