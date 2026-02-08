"use client";

import { useState } from "react";
import { whatIfTemplates } from "@/lib/templates/what-if";
import type { WhatIfTemplate } from "@/lib/templates/what-if";
import TemplateCard from "@/components/what-if/TemplateCard";
import TemplateForm from "@/components/what-if/TemplateForm";

export default function WhatIfPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<WhatIfTemplate | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">What-If Scenarios</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Explore how life changes could impact your financial future
        </p>
      </div>

      {/* Template Form Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <TemplateForm
            template={selectedTemplate}
            onCancel={() => setSelectedTemplate(null)}
          />
        </div>
      )}

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {whatIfTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onClick={() => setSelectedTemplate(template)}
          />
        ))}
      </div>
    </div>
  );
}
