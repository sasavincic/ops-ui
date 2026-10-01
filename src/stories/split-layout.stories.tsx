"use client";

import { Card, CardBody, CardHeader, CardTitle } from "../components/card";
import { SplitLayout } from "../components/split-layout";
import { Text } from "../components/text";
import type { Story } from "./index";

export const stories: Story[] = [
  {
    name: "Main and side",
    render: () => (
      <SplitLayout>
        <Card>
          <CardHeader>
            <CardTitle>Worksite</CardTitle>
          </CardHeader>
          <CardBody>
            <Text as="p" size="body" tone="secondary">
              The main column takes the room that is left; below lg the side column follows it.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardBody>
            <Text as="p" size="detail" tone="muted">
              Between 20rem and 26rem wide.
            </Text>
          </CardBody>
        </Card>
      </SplitLayout>
    ),
  },
];
