"use client";

import { SearchInput } from "../components/search-input";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

export const stories: Story[] = [
  {
    name: "Empty and filled",
    render: () => (
      <Stack className="max-w-md">
        <Row label="Empty: the / hint from lg" className="block">
          <SearchInput placeholder="Search workers…" aria-label="Search workers" />
        </Row>
        <Row label="With text: the hint hides" className="block">
          <SearchInput defaultValue="Nguyen Dinh" aria-label="Search workers" />
        </Row>
        <Row label="Narrow wrapper" className="block">
          <SearchInput placeholder="Search…" wrapperClassName="w-56" className="h-8" aria-label="Search" />
        </Row>
      </Stack>
    ),
  },
];
