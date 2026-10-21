import type { Block } from "@shared/blocks";
import type { PublicEntry } from "@shared/types";
import { HeroBlock } from "./Hero";
import {
  AccordionBlock,
  ButtonsBlock,
  CardsBlock,
  CtaBlock,
  DownloadsBlock,
  GalleryBlock,
  ImageBlock,
  OptionsBlock,
  ProgramsBlock,
  QuoteBlock,
  RichTextBlock,
  SocialBlock,
  SplitBlock,
  StatementBlock,
  StatsBlock,
  TimelineBlock,
  VideoBlock,
} from "./Content";
import { EmbedBlock } from "./Embed";
import { FormBlock } from "./Form";
import { CollectionBlock } from "./Collection";
import { blockAnchor } from "../components/OnThisPage";

export function Blocks({ blocks, collections, path }: { blocks: Block[]; collections: Record<string, PublicEntry[]>; path: string }) {
  let splitIndex = 0;
  return (
    <>
      {blocks.map((b) => {
        if (b.hidden) return null;
        return (
          <div key={b.id} id={blockAnchor(b)}>
            {renderBlock(b)}
          </div>
        );
      })}
    </>
  );

  function renderBlock(b: Block) {
    switch (b.type) {
      case "hero":
        return <HeroBlock key={b.id} block={b} />;
      case "richText":
        return <RichTextBlock key={b.id} block={b} />;
      case "statement":
        return <StatementBlock key={b.id} block={b} />;
      case "image":
        return <ImageBlock key={b.id} block={b} />;
      case "gallery":
        return <GalleryBlock key={b.id} block={b} />;
      case "split":
        return <SplitBlock key={b.id} block={b} index={splitIndex++} />;
      case "cards":
        return <CardsBlock key={b.id} block={b} />;
      case "options":
        return <OptionsBlock key={b.id} block={b} />;
      case "stats":
        return <StatsBlock key={b.id} block={b} />;
      case "accordion":
        return <AccordionBlock key={b.id} block={b} />;
      case "cta":
        return <CtaBlock key={b.id} block={b} />;
      case "quote":
        return <QuoteBlock key={b.id} block={b} />;
      case "timeline":
        return <TimelineBlock key={b.id} block={b} />;
      case "downloads":
        return <DownloadsBlock key={b.id} block={b} />;
      case "embed":
        return <EmbedBlock key={b.id} block={b} />;
      case "buttons":
        return <ButtonsBlock key={b.id} block={b} />;
      case "collection":
        return <CollectionBlock key={b.id} block={b} entries={collections[b.collection] ?? []} />;
      case "form":
        return <FormBlock key={b.id} block={b} path={path} />;
      case "programs":
        return <ProgramsBlock key={b.id} block={b} />;
      case "social":
        return <SocialBlock key={b.id} block={b} />;
      case "video":
        return <VideoBlock key={b.id} block={b} />;
      default:
        return null;
    }
  }
}
