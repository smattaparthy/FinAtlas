"use client";

import { useEffect, useState } from "react";

interface HealthScoreGaugeProps {
  score: number;
}

function getScoreColor(score: number): string {
  if (score >= 81) return "rgb(52, 211, 153)"; // emerald-400
  if (score >= 61) return "rgb(96, 165, 250)"; // blue-400
  if (score >= 41) return "rgb(251, 191, 36)"; // amber-400
  return "rgb(248, 113, 113)"; // red-400
}

function getScoreLabel(score: number): string {
  if (score >= 81) return "Excellent";
  if (score >= 61) return "Good";
  if (score >= 41) return "Fair";
  return "Poor";
}

export default function HealthScoreGauge({ score }: HealthScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    // Animate score on mount
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  // SVG arc calculations
  const size = 200;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // 270 degree arc (from 135deg to 405deg / -225deg to 45deg)
  const startAngle = 135;
  const totalAngle = 270;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (totalAngle / 360) * circumference;
  const filledLength = (animatedScore / 100) * arcLength;

  // Convert angle to radians for start/end points
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = ((startAngle + totalAngle) * Math.PI) / 180;

  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);

  // SVG arc path
  const largeArcFlag = totalAngle > 180 ? 1 : 0;
  const arcPath = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background arc */}
          <path
            d={arcPath}
            fill="none"
            stroke="rgb(39, 39, 42)" /* zinc-800 */
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Foreground arc */}
          <path
            d={arcPath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arcLength}`}
            strokeDashoffset={arcLength - filledLength}
            style={{
              transition: "stroke-dashoffset 1s ease-out, stroke 0.5s ease",
            }}
          />
        </svg>
        {/* Score text centered */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold tabular-nums" style={{ color }}>
            {score}
          </span>
          <span className="text-sm text-zinc-400 mt-1">out of 100</span>
        </div>
      </div>
      <span
        className="text-lg font-semibold -mt-4"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}
