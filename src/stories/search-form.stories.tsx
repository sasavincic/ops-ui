"use client";

import { SearchForm } from "../components/search-form";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

export const stories: Story[] = [
  {
    name: "Empty and filled",
    render: () => (
      <Stack>
        <Row label="Empty">
          <SearchForm action="#" value="" placeholder="Search name or VAT ID…" keep={{ status: "active", page: null }} />
        </Row>
        <Row label="With a query">
          <SearchForm action="#" value="hodzic" placeholder="Search name or VAT ID…" keep={{}} />
        </Row>
      </Stack>
    ),
  },
];
