"use client";

import { ActionIcon, ActionIconScope } from "../components/action-icon";
import { Button, FileLink, IconButton } from "../components/button";
import type { ActionIconName } from "../types";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

const NAMES: ActionIconName[] = [
  "add", "edit", "save", "close", "check", "delete", "archive", "restore", "enter", "exit", "calendar", "upload",
  "download", "document", "view", "copy", "send", "print", "link", "search", "filter", "list", "more", "up", "down",
  "back", "forward", "settings", "exchange", "lock", "unlock", "user", "bed", "refresh",
];

export const stories: Story[] = [
  {
    name: "Glyphs",
    render: () => (
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4 lg:grid-cols-6">
        {NAMES.map((name) => (
          <span key={name} className="inline-flex items-center gap-2 text-detail text-ink">
            <ActionIcon name={name} />
            {name}
          </span>
        ))}
      </div>
    ),
  },
  {
    // The Glyphs list above stays the 1.2 vocabulary so its baseline never moves; each later
    // glyph is shown here.
    name: "Added in 1.3",
    render: () => (
      <Stack>
        <Row label="glyphs">
          {(["sparkle", "mail"] as const).map((name) => (
            <span key={name} className="inline-flex items-center gap-2 text-detail text-ink">
              <ActionIcon name={name} />
              {name}
            </span>
          ))}
        </Row>
        <Row label="in use">
          <Button icon="sparkle" variant="secondary">
            Draft with AI
          </Button>
          <Button icon="mail" variant="ghost">
            Compose e-mail
          </Button>
          <IconButton icon="sparkle" label="Read the scan" />
          <IconButton icon="mail" label="E-mail the client" />
        </Row>
      </Stack>
    ),
  },
  {
    name: "Scope off",
    render: () => (
      <Stack>
        <Row label="Default scope: icons on">
          <Button icon="add">New worker</Button>
          <Button icon="edit" variant="secondary">Edit</Button>
          <FileLink href="#">Open PDF</FileLink>
        </Row>
        <ActionIconScope enabled={false}>
          <Row label="enabled={false}: decorative icons off, `always` and file glyphs stay">
            <Button icon="add">New worker</Button>
            <Button icon="edit" variant="secondary">Edit</Button>
            <FileLink href="#">Open PDF</FileLink>
            <span className="inline-flex items-center gap-1.5 text-detail text-ink">
              <ActionIcon name="more" always /> always
            </span>
          </Row>
        </ActionIconScope>
      </Stack>
    ),
  },
];
