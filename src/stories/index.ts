import type { ReactNode } from "react";

/**
 * One rendered state of a component, shot by the gallery (every story x brand x
 * width) and rendered by each app's /dev/kit route with the app's real providers.
 * `open` is a selector Playwright clicks before the shot (an open Dialog,
 * calendar, menu...).
 */
export type Story = { name: string; render: () => ReactNode; open?: string };

/** The stories of one component module (`<component>.stories.tsx`). */
export type StoryGroup = { component: string; stories: readonly Story[] };

/** The registry. Each `<component>.stories.tsx` is listed here. */
export const STORY_GROUPS: readonly StoryGroup[] = [];

/** URL-safe id of a story: `button--matrix`, `dialog--open-with-error`. */
export function storyId(component: string, name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${component}--${slug}`;
}

/** Finds a story by its id, or null. */
export function findStory(id: string): { group: StoryGroup; story: Story } | null {
  for (const group of STORY_GROUPS) {
    for (const story of group.stories) {
      if (storyId(group.component, story.name) === id) return { group, story };
    }
  }
  return null;
}
