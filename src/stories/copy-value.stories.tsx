"use client";

import { CopyValue } from "../components/copy-value";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

export const stories: Story[] = [
  {
    name: "Values",
    render: () => (
      <Stack>
        <Row label="A document number">
          <CopyValue value="LM-2026-001" />
        </Row>
        <Row label="A long value wraps, every character visible">
          <div className="w-48 rounded-control border border-border p-2">
            <CopyValue value="SI56 0510 0801 2345 678 · QT-ATES-LM-26004" />
          </div>
        </Row>
      </Stack>
    ),
  },
  // 1.8.0: under [data-ops-touch] on a phone the value has a 44 x 44 target; the line keeps its height.
  {
    name: "Under the touch floor",
    render: () => (
      <div data-ops-touch="">
        <Row label="A document number in a row">
          <CopyValue value="LM-2026-001" />
          <span className="text-detail text-ink-muted">beside other text</span>
        </Row>
      </div>
    ),
  },
];
