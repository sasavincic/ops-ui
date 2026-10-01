"use client";

import { useState } from "react";
import { AdminIconButton, Button, ButtonLink, ExternalButtonLink, FileLink, IconButton } from "../components/button";
import { Combobox } from "../components/combobox";
import { DateInput } from "../components/date-input";
import { Input, Select } from "../components/field";
import { RowMenu } from "../components/row-menu";
import { Segmented } from "../components/segmented";
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
        <ExternalButtonLink href="tel:+38620000000" variant="secondary" size="sm">
          Call
        </ExternalButtonLink>
      </Row>
      <Row label="admin icon buttons">
        {(["edit", "delete", "unlock", "permissions", "key", "deactivate", "reactivate"] as const).map((icon) => (
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
  {
    name: "Large",
    render: () => (
      <Stack className="gap-4">
        {VARIANTS.map((variant) => (
          <Row key={variant} label={variant}>
            <Button variant={variant} size="lg" icon={ICON[variant]}>
              Large
            </Button>
            <Button variant={variant} size="lg">
              No icon
            </Button>
            <Button variant={variant} size="md" icon={ICON[variant]}>
              Medium
            </Button>
          </Row>
        ))}
        <Row label="links">
          <ButtonLink href="#new" size="lg" icon="add">
            ButtonLink
          </ButtonLink>
          <ExternalButtonLink href="tel:+38620000000" variant="secondary" size="lg" icon="send">
            Call
          </ExternalButtonLink>
        </Row>
      </Stack>
    ),
  },
  {
    name: "Icon buttons",
    render: () => (
      <Stack className="gap-4">
        {(["sm", "md", "lg"] as const).map((size) => (
          <Row key={size} label={`size ${size}`}>
            <IconButton size={size} icon="edit" label="Edit" />
            <IconButton size={size} icon="delete" label="Delete" variant="ghostDanger" />
            <IconButton size={size} icon="download" label="Download" variant="secondary" />
            <IconButton size={size} icon="add" label="Add" variant="primary" />
            <IconButton size={size} icon="sparkle" label="Draft with AI" />
            <IconButton size={size} icon="close" label="Remove" disabled />
          </Row>
        ))}
        <ReadOnlyScope readOnly>
          <Row label="read-only scope: hidden unless readOnlySafe">
            <IconButton icon="edit" label="Edit (hidden)" />
            <IconButton icon="download" label="Download" readOnlySafe />
          </Row>
        </ReadOnlyScope>
      </Stack>
    ),
  },
  { name: "Touch floor", render: () => <TouchFloor /> },
];

/** Every control the floor covers, once as it is and once under [data-ops-touch]. */
function TouchControls({ id }: { id: string }) {
  const [worker, setWorker] = useState("w1");
  const [view, setView] = useState<"day" | "site">("day");
  const [date, setDate] = useState("2026-10-01");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm">Small</Button>
        <Button variant="secondary">Medium</Button>
        <IconButton size="sm" icon="edit" label="Edit" />
        <IconButton icon="mail" label="Write e-mail" variant="secondary" />
        <RowMenu label="Actions" items={[{ key: "edit", label: "Edit", icon: "edit", onClick: () => {} }]} />
        <Segmented
          label="Group by"
          value={view}
          onValueChange={setView}
          options={[
            { value: "day", label: "Day" },
            { value: "site", label: "Worksite" },
          ]}
        />
      </div>
      <div className="grid max-w-2xl gap-2 sm:grid-cols-2">
        <Input aria-label="Order number" defaultValue="PO-2026-118" />
        <Select aria-label="Company" defaultValue="lm">
          <option value="lm">Latro Mont</option>
          <option value="va">Vantus</option>
        </Select>
        <Combobox
          id={`${id}-worker`}
          value={worker}
          onChange={setWorker}
          options={[
            { value: "w1", label: "Barišić, Josip" },
            { value: "w2", label: "Nguyen, Dinh Hai" },
          ]}
        />
        <DateInput id={`${id}-date`} aria-label="Shipping date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
    </div>
  );
}

/**
 * The opt-in touch floor (1.3.0): on a screen that cannot hover, controls under
 * [data-ops-touch] are at least 44px (icon-only controls 44 x 44) and text inputs 16px. The
 * 375-touch shot shows the second block taller; at 1440 and 375 both blocks are identical.
 */
function TouchFloor() {
  return (
    <Stack>
      <Row label="without data-ops-touch" className="block">
        <TouchControls id="floor-off" />
      </Row>
      <div data-ops-touch="">
        <Row label="inside data-ops-touch" className="block">
          <TouchControls id="floor-on" />
        </Row>
      </div>
    </Stack>
  );
}
