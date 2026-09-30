"use client";

import { StatusIcon } from "../components/status-icon";
import type { StatusIconName } from "../types";
import type { Story } from "./index";

const NAMES: StatusIconName[] = [
  "current", "check", "clock", "alert", "problem", "question", "close", "draft",
  "ended", "inactive", "archive", "key", "lock", "send", "minus", "info",
];
const TONES = ["text-ink", "text-success", "text-warning", "text-danger", "text-info", "text-admin"];

export const stories: Story[] = [
  {
    name: "Glyphs in every tone",
    render: () => (
      <div className="grid max-w-xl grid-cols-[8rem_repeat(6,1.5rem)] items-center gap-y-2">
        {NAMES.map((name) => (
          <div key={name} className="contents">
            <span className="text-detail text-ink-secondary">{name}</span>
            {TONES.map((tone) => (
              <StatusIcon key={tone} name={name} className={tone} />
            ))}
          </div>
        ))}
      </div>
    ),
  },
];
