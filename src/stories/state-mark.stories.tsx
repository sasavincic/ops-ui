"use client";

import { StateMark } from "../components/state-mark";
import type { StateMarkSpec } from "../types";
import type { Story } from "./index";
import { Row } from "./story-layout";

const MARKS: [StateMarkSpec, string][] = [
  [{ tone: "neutral", icon: "draft" }, "Onboarding"],
  [{ tone: "neutral", icon: "inactive" }, "On exchange"],
  [{ tone: "neutral", icon: "archive" }, "Archived"],
  [{ tone: "info", icon: "send" }, "Amended"],
  [{ tone: "warning", icon: "clock" }, "Pending"],
  [{ tone: "danger", icon: "problem" }, "Overdue"],
  [{ tone: "success", icon: "check" }, "Confirmed"],
  [{ tone: "neutral", icon: "close" }, "Terminated"],
];

export const stories: Story[] = [
  {
    name: "Tones",
    render: () => (
      <Row label="The exception on a row">
        {MARKS.map(([spec, label]) => (
          <StateMark key={label} {...spec} title={label}>
            {label}
          </StateMark>
        ))}
      </Row>
    ),
  },
];
