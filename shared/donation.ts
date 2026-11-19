import type { PageDoc } from "./blocks";

export const DONATION_PATH = "/donate";
export const DONATION_FORM_URL = "https://www.zeffy.com/en-US/donation-form/build-lasting-sustainability-with-my-project-usa";
export const DONATION_ORGANIZATION_URL = "https://www.zeffy.com/en-US/organizations/my-project-usa";
export const DONATION_FORM_ANCHOR = "#section-donation-form";

/** Standalone form seed used by migration 0002, before the full giving-page consolidation. */
export const DONATION_PAGE: PageDoc = {
  title: "Donate",
  intro: "Help protect, educate, and empower youth and strengthen families in our community.",
  seo: {
    title: "Donate | MY Project USA",
    description: "Support MY Project USA. Give once or become a recurring donor using our secure donation form.",
  },
  blocks: [
    {
      id: "donation-form",
      type: "embed",
      provider: "zeffy",
      url: "https://www.zeffy.com/embed/donation-form/build-lasting-sustainability-with-my-project-usa",
      title: "Donate to MY Project USA",
      aspect: "form",
    },
    {
      id: "donation-other-ways",
      type: "buttons",
      align: "center",
      buttons: [{ label: "Other ways to give", href: "/donors", style: "secondary" }],
    },
  ],
};

/** Keep the full giving page, with the sustainability form directly after its introduction. */
export function buildDonationPage(donors: PageDoc): PageDoc {
  const page = structuredClone(donors);
  // General-giving actions on this page scroll back to its form.
  page.blocks = JSON.parse(JSON.stringify(page.blocks).replaceAll('"/donate"', JSON.stringify(DONATION_FORM_ANCHOR)));
  const hero = page.blocks[0]?.type === "hero" ? page.blocks.shift() : undefined;
  return {
    ...page,
    title: "Donate",
    seo: { ...page.seo, title: "Donate | MY Project USA" },
    blocks: [
      ...(hero ? [hero] : []),
      structuredClone(DONATION_PAGE.blocks[0]),
      {
        id: "donation-all-campaigns",
        type: "buttons",
        align: "center",
        buttons: [{ label: "View all campaigns on Zeffy", href: DONATION_ORGANIZATION_URL, style: "secondary" }],
      },
      ...page.blocks,
    ],
  };
}
