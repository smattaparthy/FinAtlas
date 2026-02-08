"use client";

import type { WhatIfTemplate } from "@/lib/templates/what-if";

interface TemplateCardProps {
  template: WhatIfTemplate;
  onClick: () => void;
}

export default function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 hover:border-zinc-600 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 group"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{template.icon}</span>
        <span
          className="text-xs px-2 py-0.5 rounded-lg font-medium"
          style={{
            backgroundColor: `${template.color}20`,
            color: template.color,
            borderColor: `${template.color}40`,
            borderWidth: 1,
          }}
        >
          {template.category}
        </span>
      </div>
      <h3 className="font-medium text-lg group-hover:text-zinc-200 transition-colors">
        {template.name}
      </h3>
      <p className="text-sm text-zinc-500 mt-1">{template.description}</p>
      <div className="mt-3 text-xs text-zinc-600">
        {template.fields.length} parameter{template.fields.length !== 1 ? "s" : ""}
      </div>
    </button>
  );
}
