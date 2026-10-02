"use client";

import { useState } from "react";
import { IconButton } from "../components/button";
import { Card } from "../components/card";
import { Input } from "../components/field";
import { FoldTable, type FoldTableColumn } from "../components/fold-table";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

type Position = { id: string; designation: string; quantity: string; weight: string; unit: string };

const POSITIONS: Position[] = [
  { id: "1", designation: "Pipe P265GH 168.3 x 7.1", quantity: "12", weight: "42.6", unit: "m" },
  { id: "2", designation: "Elbow 90° 3D DN150", quantity: "4", weight: "18.2", unit: "pc" },
  { id: "3", designation: "Weld neck flange PN40 DN150", quantity: "2", weight: "14.0", unit: "pc" },
];

function columns(onChange: (id: string, key: keyof Position, value: string) => void): FoldTableColumn<Position>[] {
  return [
    {
      key: "designation",
      header: "Designation",
      cell: (row) => <Input aria-label={`Designation ${row.id}`} className="h-8" value={row.designation} onChange={(e) => onChange(row.id, "designation", e.target.value)} />,
    },
    {
      key: "quantity",
      header: "Qty",
      numeric: true,
      foldSpan: 2,
      className: "md:w-20",
      cell: (row) => <Input aria-label={`Quantity ${row.id}`} className="h-8 text-right" value={row.quantity} onChange={(e) => onChange(row.id, "quantity", e.target.value)} />,
    },
    {
      key: "weight",
      header: "Weight",
      numeric: true,
      foldSpan: 2,
      className: "md:w-28",
      headerAction: <IconButton size="xs" icon="refresh" label="Recalculate all weights" />,
      cell: (row) => <Input aria-label={`Weight ${row.id}`} className="h-8 text-right" value={row.weight} suffix="kg" onChange={(e) => onChange(row.id, "weight", e.target.value)} />,
    },
    { key: "unit", header: "Unit", foldSpan: 2, className: "md:w-16", cell: (row) => row.unit },
    { key: "actions", header: "Actions", bare: true, foldSpan: 6, className: "w-px", cell: (row) => <IconButton size="sm" icon="delete" variant="ghostDanger" label={`Remove position ${row.id}`} /> },
  ];
}

function useRows() {
  const [rows, setRows] = useState(POSITIONS);
  const onChange = (id: string, key: keyof Position, value: string) =>
    setRows((all) => all.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  return { rows, cols: columns(onChange) };
}

/** Folds by the viewport: a table from md, labelled blocks below. */
function ByViewport() {
  const { rows, cols } = useRows();
  return (
    <Stack>
      <Row label="bordered" className="block">
        <FoldTable label="Positions" columns={cols} rows={rows} rowKey={(row) => row.id} />
      </Row>
      <Row label="flush in a card" className="block">
        <Card className="overflow-hidden p-0">
          <FoldTable label="Positions in a card" columns={cols} rows={rows} rowKey={(row) => row.id} flush />
        </Card>
      </Row>
    </Stack>
  );
}

/** Folds by its own width: the same table in a wide and in a narrow pane at any viewport. */
function ByContainer() {
  const { rows, cols } = useRows();
  return (
    <Stack>
      <Row label="a wide pane (40rem): a table" className="block">
        <div className="max-w-[40rem]">
          <FoldTable label="Positions, wide pane" columns={cols} rows={rows} rowKey={(row) => row.id} fold="container" />
        </div>
      </Row>
      <Row label="a narrow pane (20rem): folded rows" className="block">
        <div className="max-w-[20rem]">
          <FoldTable label="Positions, narrow pane" columns={cols} rows={rows} rowKey={(row) => row.id} fold="container" />
        </div>
      </Row>
    </Stack>
  );
}

export const stories: Story[] = [
  { name: "Folds by the viewport", render: () => <ByViewport /> },
  { name: "Folds by its container", render: () => <ByContainer /> },
];
