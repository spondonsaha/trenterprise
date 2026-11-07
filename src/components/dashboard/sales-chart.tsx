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
import { formatAmount } from "@/lib/money";

export type SalesPoint = {
  label: string;
  date: string;
  total: number;
};

export function SalesChart({ data }: { data: SalesPoint[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0D9488" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#0D9488" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#64748B" }}
            dy={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#64748B" }}
            width={56}
            tickFormatter={(value: number) =>
              value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
            }
          />
          <Tooltip
            cursor={{ stroke: "#0D9488", strokeDasharray: "4 4" }}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #E2E8F0",
              boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
              fontSize: 12,
            }}
            formatter={(value: number) => [`৳ ${formatAmount(value)}`, "Sales"]}
            labelFormatter={(label: string, payload) => {
              const point = payload?.[0]?.payload as SalesPoint | undefined;
              return point ? `${label} · ${point.date}` : label;
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#0D9488"
            strokeWidth={2}
            fill="url(#salesFill)"
            dot={{ r: 2.5, fill: "#0D9488", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
