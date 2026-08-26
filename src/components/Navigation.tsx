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
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
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
  );
}
