import type { ReactNode } from "react";
import { stories as actionIcon } from "./action-icon.stories";
import { stories as appSwitcher } from "./app-switcher.stories";
import { stories as attentionList } from "./attention-list.stories";
import { stories as backLink } from "./back-link.stories";
import { stories as badge } from "./badge.stories";
import { stories as button } from "./button.stories";
import { stories as callout } from "./callout.stories";
import { stories as card } from "./card.stories";
import { stories as cluster } from "./cluster.stories";
import { stories as combobox } from "./combobox.stories";
import { stories as confirmDialog } from "./confirm-dialog.stories";
import { stories as copyValue } from "./copy-value.stories";
import { stories as dateInput } from "./date-input.stories";
import { stories as descriptionList } from "./description-list.stories";
import { stories as dialog } from "./dialog.stories";
import { stories as emptyState } from "./empty-state.stories";
import { stories as field } from "./field.stories";
import { stories as formActions } from "./form-actions.stories";
import { stories as glanceCard } from "./glance-card.stories";
import { stories as grid } from "./grid.stories";
import { stories as heading } from "./heading.stories";
import { stories as kicker } from "./kicker.stories";
import { stories as monogram } from "./monogram.stories";
import { stories as monthNav } from "./month-nav.stories";
import { stories as pageHeader } from "./page-header.stories";
import { stories as pageHelp } from "./page-help.stories";
import { stories as radio } from "./radio.stories";
import { stories as recordTab } from "./record-tab.stories";
import { stories as rowMenu } from "./row-menu.stories";
import { stories as searchForm } from "./search-form.stories";
import { stories as searchInput } from "./search-input.stories";
import { stories as segmented } from "./segmented.stories";
import { stories as sheet } from "./sheet.stories";
import { stories as splitLayout } from "./split-layout.stories";
import { stories as stack } from "./stack.stories";
import { stories as stateMark } from "./state-mark.stories";
import { stories as statusIcon } from "./status-icon.stories";
import { stories as table } from "./table.stories";
import { stories as tabs } from "./tabs.stories";
import { stories as tag } from "./tag.stories";
import { stories as tagRemove } from "./tag-remove.stories";
import { stories as textButton } from "./text-button.stories";
import { stories as textLink } from "./text-link.stories";
import { stories as text } from "./text.stories";
import { stories as toast } from "./toast.stories";
import { stories as urlSelect } from "./url-select.stories";
import { stories as validityCell } from "./validity-cell.stories";
import { stories as yearInput } from "./year-input.stories";
import { stories as appFrame } from "./app-frame.stories";

/**
 * One rendered state of a component, shot by the gallery (every story x brand x
 * width) and rendered by each app's /dev/kit route with the app's real providers.
 * `open` is a selector Playwright clicks before the shot (an open Dialog,
 * calendar, menu...).
 */
export type Story = { name: string; render: () => ReactNode; open?: string };

/** The stories of one component module (`<component>.stories.tsx`). */
export type StoryGroup = { component: string; stories: readonly Story[] };

/**
 * The registry: one group per kit component, in file order. Each story module is a client
 * module, so read the registry from a client component (a server component cannot iterate a
 * client module's exports) - the gallery's StoryIndex / StoryView, an app's /dev/kit view.
 * Render each story inside `StoryHost` (./story-host): the gallery as it is, an app's /dev/kit
 * with `pageToaster` (its root layout already mounts a Toaster).
 */
export const STORY_GROUPS: readonly StoryGroup[] = [
  { component: "action-icon", stories: actionIcon },
  { component: "app-switcher", stories: appSwitcher },
  { component: "attention-list", stories: attentionList },
  { component: "back-link", stories: backLink },
  { component: "badge", stories: badge },
  { component: "button", stories: button },
  { component: "callout", stories: callout },
  { component: "card", stories: card },
  { component: "cluster", stories: cluster },
  { component: "combobox", stories: combobox },
  { component: "confirm-dialog", stories: confirmDialog },
  { component: "copy-value", stories: copyValue },
  { component: "date-input", stories: dateInput },
  { component: "description-list", stories: descriptionList },
  { component: "dialog", stories: dialog },
  { component: "empty-state", stories: emptyState },
  { component: "field", stories: field },
  { component: "form-actions", stories: formActions },
  { component: "glance-card", stories: glanceCard },
  { component: "grid", stories: grid },
  { component: "heading", stories: heading },
  { component: "kicker", stories: kicker },
  { component: "monogram", stories: monogram },
  { component: "month-nav", stories: monthNav },
  { component: "page-header", stories: pageHeader },
  { component: "page-help", stories: pageHelp },
  { component: "radio", stories: radio },
  { component: "record-tab", stories: recordTab },
  { component: "row-menu", stories: rowMenu },
  { component: "search-form", stories: searchForm },
  { component: "search-input", stories: searchInput },
  { component: "segmented", stories: segmented },
  { component: "sheet", stories: sheet },
  { component: "split-layout", stories: splitLayout },
  { component: "stack", stories: stack },
  { component: "state-mark", stories: stateMark },
  { component: "status-icon", stories: statusIcon },
  { component: "table", stories: table },
  { component: "tabs", stories: tabs },
  { component: "tag", stories: tag },
  { component: "tag-remove", stories: tagRemove },
  { component: "text", stories: text },
  { component: "text-button", stories: textButton },
  { component: "text-link", stories: textLink },
  { component: "toast", stories: toast },
  { component: "url-select", stories: urlSelect },
  { component: "validity-cell", stories: validityCell },
  { component: "year-input", stories: yearInput },
  // The shell (1.5.0, src/shell/): one group for the frame and its parts, after the components.
  { component: "app-frame", stories: appFrame },
];

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
