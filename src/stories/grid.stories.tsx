"use client";

import { Field, Input } from "../components/field";
import { Grid } from "../components/grid";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

const Cell = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-control bg-surface px-3 py-2 text-detail text-ink-secondary">{children}</div>
);

export const stories: Story[] = [
  {
    name: "Templates",
    render: () => (
      <Stack>
        <Row label="gap 3, two columns from sm (form fields)" className="block">
          <Grid gap={3} cols={2} from="sm">
            <Field label="Street" htmlFor="g-street">
              <Input id="g-street" defaultValue="Tržaška cesta 23" />
            </Field>
            <Field label="City" htmlFor="g-city">
              <Input id="g-city" defaultValue="Maribor" />
            </Field>
            <Field label="Notes" htmlFor="g-notes" className="sm:col-span-2">
              <Input id="g-notes" defaultValue="Spans both columns" />
            </Field>
          </Grid>
        </Row>
        <Row label="gap 3, two columns at every width" className="block">
          <Grid gap={3} cols={2}>
            <Cell>One</Cell>
            <Cell>Two</Cell>
          </Grid>
        </Row>
        <Row label="gap 6, two columns from lg, aligned to the start" className="block">
          <Grid gap={6} cols={2} from="lg" align="start">
            <Cell>A taller cell with a second line of text to show the start alignment.</Cell>
            <Cell>Short</Cell>
          </Grid>
        </Row>
        <Row label="gap 3, three columns from sm" className="block">
          <Grid gap={3} cols={3} from="sm">
            <Cell>One</Cell>
            <Cell>Two</Cell>
            <Cell>Three</Cell>
          </Grid>
        </Row>
      </Stack>
    ),
  },
];
