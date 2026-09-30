import { StoryView } from "../../../components/story-view";

/** One story, alone on the page: what the shot captures. */
export default async function StoryPage({ params }: { params: Promise<{ brand: string; story: string }> }) {
  const { story } = await params;
  return <StoryView id={story} />;
}
