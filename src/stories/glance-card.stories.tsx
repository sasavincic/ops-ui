"use client";

import { DD, DescriptionList, DT } from "../components/description-list";
import { GlanceCard } from "../components/glance-card";
import type { Story } from "./index";

export const stories: Story[] = [
  {
    name: "Cards",
    render: () => (
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <GlanceCard title="Compliance" href="#compliance">
          <p className="text-sm text-ink-secondary">3 papers recorded, 1 due within 30 days.</p>
        </GlanceCard>
        <GlanceCard title="Skills" href="#skills" openLabel="All skills">
          <DescriptionList>
            <DT>Assessments</DT>
            <DD>4</DD>
            <DT>Languages</DT>
            <DD>German B1, English A2</DD>
          </DescriptionList>
        </GlanceCard>
      </div>
    ),
  },
];
