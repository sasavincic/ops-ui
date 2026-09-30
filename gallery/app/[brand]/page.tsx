import { BRANDS, REQUIRED_BRAND_VARIABLES } from "../../brands";
import { StoryIndex } from "../../components/story-index";

export default async function BrandIndex({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8 font-sans">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">@latro/ops-ui gallery</h1>
        <nav className="flex gap-3 text-sm" aria-label="Brands">
          {BRANDS.map((b) => (
            <a
              key={b}
              href={`/${b}`}
              aria-current={b === brand ? "page" : undefined}
              className={b === brand ? "font-semibold underline" : "underline-offset-2 hover:underline"}
            >
              {b}
            </a>
          ))}
        </nav>
      </header>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Brand variables</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {REQUIRED_BRAND_VARIABLES.map((name) => (
            <li key={name} className="space-y-1 text-xs" data-brand-variable={name}>
              <div className="h-10 rounded border border-black/10" style={{ background: `var(${name})` }} />
              <code>{name.replace("--brand-", "")}</code>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Stories</h2>
        <StoryIndex brand={brand} />
      </section>
    </main>
  );
}
