"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Flower2, BellRing, Settings } from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plants", label: "My Garden", icon: Flower2 },
  { href: "/reminders", label: "Reminders", icon: BellRing },
  { href: "/settings", label: "Home Assistant", icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Top navigation (desktop only, >= md) */}
      <nav className="hidden md:block bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={clsx(
                    "inline-flex items-center px-1 pt-4 pb-3 border-b-2 text-sm font-medium transition-colors",
                    isActive
                      ? "border-emerald-600 text-emerald-700 font-semibold"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  )}
                >
                  <Icon className={clsx("w-4 h-4 mr-2", isActive ? "text-emerald-600" : "text-slate-400")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Bottom tab bar (mobile only, < md) */}
      <nav
        className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={clsx(
                  "relative flex flex-col items-center justify-center gap-1 min-h-[56px] px-1 text-[11px] font-medium transition-colors",
                  isActive
                    ? "text-emerald-700 font-semibold"
                    : "text-slate-500 active:text-slate-700 active:bg-slate-100"
                )}
              >
                {isActive && (
                  <span className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-emerald-600" aria-hidden="true" />
                )}
                <Icon className={clsx("w-5 h-5", isActive ? "text-emerald-600" : "text-slate-400")} />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
