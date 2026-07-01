"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

/** Gráfica de área con las ventas diarias de los últimos 30 días. */
export function SalesChart({ data }: { data: { date: string; total: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2b68ad" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2b68ad" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            width={44}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), "Ventas"]}
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              fontSize: "0.8rem",
              color: "var(--foreground)",
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#2b68ad"
            strokeWidth={2}
            fill="url(#salesGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
