"use client";

import { useState } from "react";
import { Card } from "../components/card";
import { Disclosure } from "../components/disclosure";
import { Tag } from "../components/tag";
import { Text } from "../components/text";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

function Variants() {
  const [open, setOpen] = useState(true);
  return (
    <Stack className="max-w-2xl">
      <Row label="bordered, a kicker and meta, controlled" className="block">
        <Disclosure bordered kicker="Step 1" title="Material worksheet" meta={<Tag>3 positions</Tag>} open={open} onToggle={setOpen}>
          <Text as="p" size="detail" tone="secondary">
            The worksheet the offer is priced from.
          </Text>
        </Disclosure>
      </Row>
      <Row label="flush in a card, closed by default" className="block">
        <Card className="overflow-hidden p-0">
          <Disclosure title="Pressure test" meta={<Text size="detail" tone="muted">Ready</Text>}>
            <Text as="p" size="detail" tone="secondary">The pressure test report.</Text>
          </Disclosure>
          <div className="border-t border-border">
            <Disclosure title="Welding" defaultOpen>
              <Text as="p" size="detail" tone="secondary">Welders and WPS.</Text>
            </Disclosure>
          </div>
        </Card>
      </Row>
      <Row label="large summary (48px), flush body" className="block">
        <Disclosure bordered large flushBody title="Drawings" defaultOpen>
          <ul className="divide-y divide-border">
            <li className="px-4 py-2 text-sm">26-118-01.pdf</li>
            <li className="px-4 py-2 text-sm">26-118-02.pdf</li>
          </ul>
        </Disclosure>
      </Row>
    </Stack>
  );
}

export const stories: Story[] = [{ name: "Variants", render: () => <Variants /> }];
