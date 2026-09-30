"use client";

import { Button } from "../components/button";
import { Card, CardBody, CardHeader, CardTitle } from "../components/card";
import type { Story } from "./index";

export const stories: Story[] = [
  {
    name: "Solid and ghost",
    render: () => (
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Employment</CardTitle>
            <Button variant="ghost" size="sm" icon="edit">
              Edit
            </Button>
          </CardHeader>
          <CardBody className="text-sm text-ink-secondary">Latro Mont d.o.o. since 01-08-2026, fixed term until 31-07-2027.</CardBody>
        </Card>
        <Card variant="ghost">
          <CardBody className="text-sm text-ink-muted">An unfilled seat: the ghost card is a dashed placeholder.</CardBody>
        </Card>
      </div>
    ),
  },
];
