"use client";

import { useEffect, useRef } from "react";
import { findStory } from "../../src/stories";
import { StoryHost } from "../../src/stories/story-host";

/**
 * Renders one story inside a padded frame; the frame is what the shot captures.
 * `data-ready` is set once the story has hydrated: effects run child-first, so by
 * then every story's own mount effects (an open Dialog's showModal, a toast
 * pushed on mount) have run. The shots wait for it. StoryHost is the frame an app's /dev/kit
 * view uses too (there with `pageToaster`, because the app's root layout mounts a Toaster).
 */
export function StoryView({ id }: { id: string }) {
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    frame.current?.setAttribute("data-ready", "");
  }, []);
  const found = findStory(id);
  if (!found) return <p className="p-8 text-sm">No story {id}.</p>;
  return (
    <div ref={frame} className="p-6" data-story={id}>
      <StoryHost>{found.story.render()}</StoryHost>
    </div>
  );
}
