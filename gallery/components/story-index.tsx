"use client";

import { STORY_GROUPS, storyId } from "../../src/stories";

/**
 * The list of stories, links only: never two stories on one page (spec §3.2). A client component
 * on purpose: a story module may be a client module, whose exports a server component cannot
 * iterate. The links carry the DOM contract an app's /dev/kit index keeps for tools/app-shots.mjs
 * (spec §11.4): `data-story-id`, and `data-story-open` when the story has an `open` selector.
 */
export function StoryIndex({ brand }: { brand: string }) {
  if (STORY_GROUPS.length === 0) return <p className="text-sm">No stories yet.</p>;
  return (
    <ul className="space-y-3 text-sm">
      {STORY_GROUPS.map((group) => (
        <li key={group.component}>
          <h3 className="font-semibold">{group.component}</h3>
          <ul className="ml-4 list-disc">
            {group.stories.map((story) => {
              const id = storyId(group.component, story.name);
              return (
                <li key={story.name}>
                  <a className="underline-offset-2 hover:underline" href={`/${brand}/${id}`} data-story-id={id} data-story-open={story.open}>
                    {story.name}
                  </a>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}
