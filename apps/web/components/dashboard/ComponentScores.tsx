"use client";

interface ComponentScore {
  name: string;
  score: number;
  weight: number;
  description: string;
}

interface ComponentScoresProps {
  components: ComponentScore[];
}

function getBarColor(score: number): string {
  if (score >= 81) return "bg-emerald-400";
  if (score >= 61) return "bg-blue-400";
  if (score >= 41) return "bg-amber-400";
  return "bg-red-400";
}

function getTextColor(score: number): string {
  if (score >= 81) return "text-emerald-400";
  if (score >= 61) return "text-blue-400";
  if (score >= 41) return "text-amber-400";
  return "text-red-400";
}

export default function ComponentScores({ components }: ComponentScoresProps) {
  return (
    <div className="space-y-4">
      {components.map((component) => (
        <div key={component.name}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-zinc-300">{component.name}</span>
            <span className={`text-sm font-semibold tabular-nums ${getTextColor(component.score)}`}>
              {component.score}/100
            </span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(component.score)}`}
              style={{ width: `${component.score}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 mt-1">{component.description}</p>
        </div>
      ))}
    </div>
  );
}
