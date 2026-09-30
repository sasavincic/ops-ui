"use client";

import { Button } from "../components/button";
import { EmptyState } from "../components/empty-state";
import type { Story } from "./index";
import { Stack } from "./story-layout";

export const stories: Story[] = [
  {
    name: "Variants",
    render: () => (
      <Stack className="max-w-2xl">
        <EmptyState
          title="No workers match these filters"
          description="Clear the filters to see every worker."
          action={
            <Button variant="secondary" size="sm" icon="close" readOnlySafe>
              Clear filters
            </Button>
          }
        />
        <EmptyState title="No documents yet" />
      </Stack>
    ),
  },
];
