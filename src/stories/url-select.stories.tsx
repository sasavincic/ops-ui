"use client";

import { Suspense } from "react";
import { UrlSelect } from "../components/url-select";
import type { Story } from "./index";
import { Row } from "./story-layout";

export const stories: Story[] = [
  {
    name: "Filter",
    render: () => (
      <Row label="A filter in the URL">
        <Suspense fallback={null}>
          <UrlSelect
            param="status"
            value="active"
            label="Status"
            reset={["page"]}
            options={[
              { value: "", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
            ]}
          />
        </Suspense>
      </Row>
    ),
  },
];
