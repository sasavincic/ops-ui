import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "./card";

/** Overview glance: a tab's key numbers at sight, linking into the tab. */
export function GlanceCard({
  title,
  href,
  openLabel = "Open",
  children,
}: {
  title: string;
  href: string;
  /** Localised link text — pass strings.open. */
  openLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Link
          href={href}
          className="text-detail text-ink-secondary underline underline-offset-2 hover:text-ink"
        >
          {openLabel}
        </Link>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}
