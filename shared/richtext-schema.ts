/** Server/admin validation for stored rich text (kept separate so public pages don't ship zod). */
import { z } from "zod";
import { isSafeHref, type RichNode } from "./richtext";

const href = z.string().max(2048).refine(isSafeHref, "Links must start with https://, mailto:, tel: or /");
const align = z.enum(["left", "center", "right"]).nullable().optional();

const markSchema = z.union([
  z.object({ type: z.enum(["bold", "italic", "underline", "strike"]) }).strip(),
  z
    .object({
      type: z.literal("link"),
      attrs: z.object({ href, target: z.enum(["_blank"]).nullable().optional() }).strip(),
    })
    .strip(),
]);

const nodeSchema: z.ZodType<RichNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z
      .object({
        type: z.literal("text"),
        text: z.string().max(20000),
        marks: z.array(markSchema).max(6).optional(),
      })
      .strip(),
    z.object({ type: z.literal("hardBreak") }).strip(),
    z.object({ type: z.literal("horizontalRule") }).strip(),
    z
      .object({
        type: z.literal("paragraph"),
        attrs: z.object({ textAlign: align }).strip().optional(),
        content: z.array(nodeSchema).max(2000).optional(),
      })
      .strip(),
    z
      .object({
        type: z.literal("heading"),
        attrs: z
          .object({
            level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
            textAlign: align,
          })
          .strip(),
        content: z.array(nodeSchema).max(2000).optional(),
      })
      .strip(),
    z
      .object({
        type: z.enum(["bulletList", "orderedList", "listItem", "blockquote"]),
        content: z.array(nodeSchema).max(2000).optional(),
      })
      .strip(),
  ]),
) as z.ZodType<RichNode>;

export const richDocSchema = z.object({ type: z.literal("doc"), content: z.array(nodeSchema).max(5000) }).strip();
