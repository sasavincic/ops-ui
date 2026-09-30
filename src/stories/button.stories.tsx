"use client";

import { AdminIconButton, Button, ButtonLink, FileLink } from "../components/button";
import { ReadOnlyScope } from "../config/read-only";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

const VARIANTS = ["primary", "secondary", "ghost", "ghostDanger", "admin", "danger"] as const;
const ICON = { primary: "add", secondary: "edit", ghost: "view", ghostDanger: "delete", admin: "unlock", danger: "delete" } as const;

function Matrix() {
  return (
    <Stack className="gap-4">
      {VARIANTS.map((variant) => (
        <Row key={variant} label={variant}>
          <Button variant={variant} icon={ICON[variant]}>
            With icon
          </Button>
          <Button variant={variant}>No icon</Button>
          <Button variant={variant} size="sm" icon={ICON[variant]}>
            Small
          </Button>
          <Button variant={variant} icon={ICON[variant]} disabled>
            Disabled
          </Button>
          <Button variant={variant} icon={ICON[variant]} readOnlySafe>
            readOnlySafe
          </Button>
        </Row>
      ))}
      <Row label="links">
        <ButtonLink href="#new" icon="add">
          ButtonLink
        </ButtonLink>
        <ButtonLink href="#back" variant="ghost" icon="back" returnNavigation>
          Return link
        </ButtonLink>
        <ButtonLink href="#open" variant="secondary" size="sm" readOnlySafe>
          readOnlySafe link
        </ButtonLink>
        <FileLink href="#file">Open PDF</FileLink>
        <FileLink href="#file" size="md" download="contract.pdf" target="_self">
          Download
        </FileLink>
        <FileLink disabled>Not generated</FileLink>
      </Row>
      <Row label="admin icon buttons">
        {(["edit", "delete", "unlock", "permissions", "key"] as const).map((icon) => (
          <AdminIconButton key={icon} icon={icon} label={`Admin ${icon}`} />
        ))}
      </Row>
    </Stack>
  );
}

export const stories: Story[] = [
  { name: "Matrix", render: () => <Matrix /> },
  {
    name: "Matrix in a read-only scope",
    render: () => (
      <ReadOnlyScope readOnly>
        <Matrix />
      </ReadOnlyScope>
    ),
  },
];
