"use client";

import { findStory } from "../../src/stories";

/** Renders one story inside a padded frame; the frame is what the shot captures. */
export function StoryView({ id }: { id: string }) {
  const found = findStory(id);
  if (!found) return <p className="p-8 text-sm">No story {id}.</p>;
  return (
    <div className="p-6" data-story={id}>
      {found.story.render()}
    </div>
  );
}
