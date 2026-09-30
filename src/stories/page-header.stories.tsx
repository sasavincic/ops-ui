"use client";

import { Badge } from "../components/badge";
import { Button } from "../components/button";
import { PageHeader } from "../components/page-header";
import type { Story } from "./index";
import { Stack } from "./story-layout";

export const stories: Story[] = [
  {
    name: "Variants",
    render: () => (
      <Stack className="gap-10">
        <PageHeader
          backHref="#workers"
          backLabel="Workers"
          title="Hodžić, Aldin"
          meta={
            <Badge variant="success" icon="current">
              Deployed
            </Badge>
          }
          description="Welder TIG (141) · Bosnia and Herzegovina"
          actions={
            <>
              <Button variant="secondary" icon="archive">
                Archive
              </Button>
              <Button variant="secondary" icon="edit">
                Edit
              </Button>
              <Button icon="add">New worker</Button>
            </>
          }
        />
        <PageHeader title="Workers" />
      </Stack>
    ),
  },
];
