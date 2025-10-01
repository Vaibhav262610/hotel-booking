"use client"

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  { day: "Mon", occupancy: 75 },
  { day: "Tue", occupancy: 82 },
  { day: "Wed", occupancy: 68 },
  { day: "Thu", occupancy: 90 },
  { day: "Fri", occupancy: 85 },
  { day: "Sat", occupancy: 95 },
  { day: "Sun", occupancy: 78 },
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
            {`${entry.name}: ${entry.value}%`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function OccupancyChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="occupancy" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
