import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FileLink } from "../src/components/button";
import { ReadOnlyScope } from "../src/config/read-only";

// Ported from workforce-ops tests/ui/file-link.test.tsx (spec §11.1). The app's
// PermissionsProvider + WriteScope with no granted area is, in the library, a
// read-only scope: that is exactly what the app's WriteScope renders (§6.3).
describe("file controls", () => {
  it("keeps a real new-tab file link and its icon available in a read-only workspace", () => {
    const html = renderToStaticMarkup(
      <ReadOnlyScope readOnly>
        <FileLink href="/example.pdf">Open PDF</FileLink>
      </ReadOnlyScope>
    );
    expect(html).toContain("<a ");
    expect(html).toContain('href="/example.pdf"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html.match(/data-action-icon="document"/g)).toHaveLength(1);
  });
  it("preserves an explicit download target and filename", () => {
    const html = renderToStaticMarkup(
      <FileLink href="/example/pdf?download" target="_self" download="example.pdf">
        Download PDF
      </FileLink>
    );
    expect(html).toContain('href="/example/pdf?download"');
    expect(html).toContain('target="_self"');
    expect(html).toContain('download="example.pdf"');
  });
  it.each([undefined, "/not-ready.pdf"])("does not expose a navigable href while disabled (%s)", (href) => {
    const html = renderToStaticMarkup(
      <FileLink href={href} disabled>
        Download PDF
      </FileLink>
    );
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("href=");
    expect(html).not.toContain("tabindex=");
  });
});
