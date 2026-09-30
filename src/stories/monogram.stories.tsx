"use client";

import { Monogram } from "../components/monogram";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

export const stories: Story[] = [
  {
    name: "Tones",
    render: () => (
      <Stack>
        <Row label="Own companies">
          <Monogram code="LM" title="Latro Mont d.o.o." />
          <Monogram code="VA" />
        </Row>
        <Row label="Not ours (external)">
          <Monogram code="MET" tone="external" title="Metalmont s.p." />
          <Monogram code="AP" tone="external" />
        </Row>
        <Row label="Beside a name">
          <span className="inline-flex items-center gap-2 text-sm text-ink">
            <Monogram code="LM" /> Hodžić, Aldin
          </span>
          <span className="inline-flex items-center gap-2 text-sm text-ink">
            <Monogram code="MET" tone="external" /> Mehmedović, Senad
          </span>
        </Row>
      </Stack>
    ),
  },
];
