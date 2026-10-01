"use client";

import { Cluster } from "../components/cluster";
import { Tag } from "../components/tag";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

function Box({ tall }: { tall?: boolean }) {
  return <span className={tall ? "block h-8 w-12 rounded-control border border-border bg-surface-raised" : "block h-4 w-12 rounded-control border border-border bg-surface-raised"} />;
}

const TAGS = ["Welder TIG (141)", "Pipe Fitter", "Foreman", "Electrician", "Helper", "Welder MAG (135/136/138)"];

export const stories: Story[] = [
  {
    name: "Align and justify",
    render: () => (
      <Stack>
        {(["center", "start", "baseline", "end", "stretch"] as const).map((align) => (
          <Row key={align} label={`align ${align}`}>
            <Cluster align={align} gap={2} className="w-64 border border-dashed border-border">
              <Box tall />
              <Box />
              <span className="text-sm text-ink">Text</span>
            </Cluster>
          </Row>
        ))}
        {(["start", "between", "end", "center"] as const).map((justify) => (
          <Row key={justify} label={`justify ${justify}`}>
            <Cluster justify={justify} gap={2} className="w-64 border border-dashed border-border">
              <Box />
              <Box />
            </Cluster>
          </Row>
        ))}
      </Stack>
    ),
  },
  {
    name: "Wrapping",
    render: () => (
      <Stack>
        <Row label="wrap (default), gap 1.5">
          <Cluster gap={1.5} className="w-72">
            {TAGS.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </Cluster>
        </Row>
        <Row label="wrap false, gap 2">
          <Cluster wrap={false} gap={2} className="w-72 overflow-hidden">
            {TAGS.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </Cluster>
        </Row>
      </Stack>
    ),
  },
];
