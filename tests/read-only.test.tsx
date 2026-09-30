import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminIconButton, Button, ButtonLink, FileLink } from "../src/components/button";
import { CopyValue } from "../src/components/copy-value";
import { DateInput } from "../src/components/date-input";
import { Checkbox, CheckTile, Field, FileInput, Input, Select, Switch, Textarea } from "../src/components/field";
import { RecordTab, RecordTabAction, RecordTabNote } from "../src/components/record-tab";
import { RowMenu } from "../src/components/row-menu";
import { SearchInput } from "../src/components/search-input";
import { ReadOnlyScope, useReadOnlyScope } from "../src/config/read-only";

// The read-only scope (spec §6.2, §11.1 `read-only`): ONE context, in the library. An app's
// WriteScope resolves its permission area and renders <ReadOnlyScope readOnly={!canWrite}>;
// everything inside is default-deny.

function ScopeProbe() {
  return <i>{String(useReadOnlyScope())}</i>;
}
const inScope = (node: React.ReactNode) => renderToStaticMarkup(<ReadOnlyScope readOnly>{node}</ReadOnlyScope>);
const noop = () => {};

describe("ReadOnlyScope / useReadOnlyScope", () => {
  it("defaults to writable outside a scope", () => {
    expect(renderToStaticMarkup(<ScopeProbe />)).toBe("<i>false</i>");
  });

  it("provides its value, and a nested readOnly={false} re-opens a subtree", () => {
    expect(
      renderToStaticMarkup(
        <ReadOnlyScope readOnly>
          <ScopeProbe />
          <ReadOnlyScope readOnly={false}>
            <ScopeProbe />
            <ReadOnlyScope readOnly>
              <ScopeProbe />
            </ReadOnlyScope>
          </ReadOnlyScope>
        </ReadOnlyScope>,
      ),
    ).toBe("<i>true</i><i>false</i><i>true</i>");
  });
});

describe("buttons in a read-only scope", () => {
  it("a Button renders nothing unless it is readOnlySafe", () => {
    expect(inScope(<Button>Save</Button>)).toBe("");
    expect(inScope(<Button readOnlySafe>Show all</Button>)).toContain(">Show all</button>");
    expect(
      inScope(
        <ReadOnlyScope readOnly={false}>
          <Button>Save</Button>
        </ReadOnlyScope>,
      ),
    ).toContain(">Save</button>");
  });

  it("ButtonLink and AdminIconButton go too; FileLink and CopyValue stay (they change no data)", () => {
    expect(inScope(<ButtonLink href="/x">New worker</ButtonLink>)).toBe("");
    expect(inScope(<ButtonLink href="/x" readOnlySafe>Open</ButtonLink>)).toContain('href="/x"');
    expect(inScope(<AdminIconButton label="Correct" />)).toBe("");
    expect(renderToStaticMarkup(<AdminIconButton label="Correct" />)).toContain('aria-label="Correct"');
    expect(inScope(<FileLink href="/a.pdf">Open PDF</FileLink>)).toContain('href="/a.pdf"');
    expect(inScope(<CopyValue value="LM-2026-001" />)).toContain("LM-2026-001");
  });

  it("the row kebab is a kit Button, so the whole menu disappears", () => {
    const items = [{ key: "e", label: "Edit", icon: "edit" as const, onClick: noop }];
    expect(renderToStaticMarkup(<RowMenu label="Row actions" items={items} />)).toContain('aria-label="Row actions"');
    expect(inScope(<RowMenu label="Row actions" items={items} />)).not.toContain("<button");
  });

  it("a record tab drops its action row and its note", () => {
    const tab = (
      <RecordTab intro="Documents of this worker." action={<RecordTabAction onClick={noop}>New document</RecordTabAction>}>
        <RecordTabNote>End the deployment first.</RecordTabNote>
        <p>table</p>
      </RecordTab>
    );
    const open = renderToStaticMarkup(tab);
    expect(open).toContain(">New document</button>");
    expect(open).toContain("End the deployment first.");
    const closed = inScope(tab);
    expect(closed).not.toContain("New document");
    expect(closed).not.toContain("End the deployment first.");
    expect(closed).toContain("Documents of this worker.");
    expect(closed).toContain("<p>table</p>");
  });
});

describe("fields in a read-only scope come up disabled", () => {
  const disabled = /<(input|select|textarea|button)[^>]* disabled=""/;

  it("Input, Select, Textarea, Checkbox, CheckTile, FileInput and Switch", () => {
    const controls: [string, React.ReactNode][] = [
      ["Input", <Input key="i" name="a" />],
      ["Select", <Select key="s" name="a"><option>x</option></Select>],
      ["Textarea", <Textarea key="t" name="a" />],
      ["Checkbox", <Checkbox key="c" label="Mobile" name="a" />],
      ["CheckTile", <CheckTile key="ct" label="Welder" name="a" />],
      ["FileInput", <FileInput key="f" name="a" />],
      ["Switch", <Switch key="sw" label="Never expires" checked={false} onChange={noop} />],
    ];
    for (const [name, node] of controls) {
      expect(renderToStaticMarkup(node), name).not.toMatch(disabled);
      expect(inScope(node), name).toMatch(disabled);
    }
  });

  it("a Field keeps its label and hint; the control inside is what locks", () => {
    const html = inScope(
      <Field label="PIN" htmlFor="pin" hint="13 digits">
        <Input id="pin" />
      </Field>,
    );
    expect(html).toContain(">PIN</label>");
    expect(html).toContain("13 digits");
    expect(html).toMatch(/<input[^>]* disabled=""/);
  });

  it("readOnlySafe fields stay usable, and the page search is one", () => {
    expect(inScope(<Input name="a" readOnlySafe />)).not.toMatch(/ disabled=""/);
    expect(inScope(<SearchInput name="q" />)).not.toMatch(/ disabled=""/);
  });

  it("the DateInput comes up disabled without its calendar button", () => {
    expect(renderToStaticMarkup(<DateInput name="d" />)).not.toMatch(/<input[^>]* disabled=""/);
    expect(renderToStaticMarkup(<DateInput name="d" />)).toContain('aria-label="Open calendar"');
    const locked = inScope(<DateInput name="d" defaultValue="2026-09-30" />);
    expect(locked).toMatch(/<input[^>]* disabled=""/);
    expect(locked).not.toContain('aria-label="Open calendar"');
    expect(locked).toContain('value="30-09-2026"');
    expect(locked).toContain('name="d" value="2026-09-30"');
    expect(inScope(<DateInput name="d" readOnlySafe />)).not.toMatch(/<input[^>]* disabled=""/);
  });
});
