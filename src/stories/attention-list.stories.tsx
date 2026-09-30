"use client";

import { AttentionList } from "../components/attention-list";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

export const stories: Story[] = [
  {
    name: "Items",
    render: () => (
      <Stack>
        <Row label="Danger, warning, missing data">
          <AttentionList
            items={[
              { tone: "danger", text: "Missing: PIN, tax number, home address", icon: "question" },
              { tone: "danger", text: "2 expired" },
              { tone: "warning", text: "1 due within 30 days" },
              { tone: "warning", text: "No bed after the move to Rotterdam · MAXS — a long line wraps under its glyph", icon: "alert" },
            ]}
            className="max-w-sm"
          />
        </Row>
        <Row label="Nothing to do renders nothing">
          <div className="min-h-8 min-w-40 rounded-control border border-dashed border-border px-3 py-1.5">
            <AttentionList items={[]} />
          </div>
        </Row>
      </Stack>
    ),
  },
];
