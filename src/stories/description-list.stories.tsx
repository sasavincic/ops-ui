"use client";

import { DD, DescriptionList, DT, NotSet, Value } from "../components/description-list";
import type { Story } from "./index";

export const stories: Story[] = [
  {
    name: "Overview",
    render: () => (
      <DescriptionList className="max-w-2xl">
        <DT>Name</DT>
        <DD>Hodžić, Aldin</DD>
        <DT>Profession</DT>
        <DD>
          <Value value="Welder TIG (141)" notSet="Not set" />
        </DD>
        <DT>Tax number</DT>
        <DD>
          <Value value={null} notSet="Not set" />
        </DD>
        <DT>Home address</DT>
        <DD>
          <NotSet label="Not recorded yet" />
        </DD>
        <DT>Notes</DT>
        <DD>A long value wraps within its column and never pushes the labels aside on a narrow screen.</DD>
      </DescriptionList>
    ),
  },
];
