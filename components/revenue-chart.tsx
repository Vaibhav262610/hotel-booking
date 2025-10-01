"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  { day: "Mon", revenue: 45000 },
  { day: "Tue", revenue: 52000 },
  { day: "Wed", revenue: 48000 },
  { day: "Thu", revenue: 61000 },
  { day: "Fri", revenue: 55000 },
  { day: "Sat", revenue: 67000 },
  { day: "Sun", revenue: 58000 },
]

// Custom Tooltip component for better contrast in light mode
interface TooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
  }>
  label?: string
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">{`Day: ${label}`}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-gray-700 dark:text-gray-300">
            {`${entry.name}: ₹${entry.value?.toLocaleString()}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: "hsl(var(--primary))" }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
