"use client";

import { Button } from "../components/button";
import { BottomActions, HeaderActions } from "../components/form-actions";
import { PageHeader } from "../components/page-header";
import type { Story } from "./index";

function Actions() {
  return (
    <>
      <Button variant="ghost" icon="close">
        Cancel
      </Button>
      <Button icon="save">Save worker</Button>
    </>
  );
}

export const stories: Story[] = [
  {
    name: "Header and bottom",
    render: () => (
      <div className="flex max-w-3xl flex-col gap-4">
        <PageHeader
          title="New worker"
          actions={
            <HeaderActions>
              <Actions />
            </HeaderActions>
          }
        />
        <p className="text-sm text-ink-secondary">The form. From sm the actions sit in the header; on a phone they follow the form.</p>
        <BottomActions>
          <Actions />
        </BottomActions>
      </div>
    ),
  },
];
