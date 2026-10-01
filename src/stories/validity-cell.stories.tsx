"use client";

import { ValidityCell, ValidityNote } from "../components/validity-cell";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

/** A fixed "today", so the day counts never move. */
const TODAY = "2026-10-01";

export const stories: Story[] = [
  {
    name: "States",
    render: () => (
      <Stack>
        <Row label="valid">
          <ValidityCell date="2027-03-15" today={TODAY} />
        </Row>
        <Row label="due (30 days)">
          <ValidityCell date="2026-10-13" today={TODAY} />
        </Row>
        <Row label="due today">
          <ValidityCell date={TODAY} today={TODAY} />
        </Row>
        <Row label="expired">
          <ValidityCell date="2026-09-21" today={TODAY} />
        </Row>
        <Row label="unknown">
          <ValidityCell date={null} today={TODAY} />
        </Row>
        <Row label="no expiry">
          <ValidityCell date={null} today={TODAY} noExpiry />
        </Row>
        <Row label="label">
          <ValidityCell date="2026-10-13" today={TODAY} label="Confirmation" />
          <ValidityCell date="2027-03-15" today={TODAY} label="Confirmation" />
        </Row>
        <Row label="warnDays 60">
          <ValidityCell date="2026-11-20" today={TODAY} warnDays={60} />
        </Row>
      </Stack>
    ),
  },
  {
    name: "Note",
    render: () => (
      <Stack>
        <Row label="expired / due / unknown / valid (nothing)">
          <ValidityNote date="2026-09-21" today={TODAY} />
          <ValidityNote date="2026-10-13" today={TODAY} label="Confirmation" />
          <ValidityNote date={null} today={TODAY} />
          <ValidityNote date="2027-03-15" today={TODAY} />
        </Row>
      </Stack>
    ),
  },
];
