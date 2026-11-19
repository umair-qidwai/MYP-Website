/** Visitor-first information architecture. Content remains editable with the existing CMS blocks. */
import type { Block, BlockOf, ButtonRef, PageDoc } from "./blocks";
import type { Settings } from "./settings";
import type { RichDoc } from "./richtext";

const doc = (...paragraphs: string[]): RichDoc => ({
  type: "doc",
  content: paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
});
const button = (label: string, href: string, style: ButtonRef["style"] = "primary"): ButtonRef => ({ label, href, style });
const hero = (id: string, heading: string, text: string, buttons: ButtonRef[] = []): BlockOf<"hero"> => ({
  id,
  type: "hero",
  variant: "plain",
  eyebrow: "MY Project USA · Columbus, Ohio",
  heading,
  body: doc(text),
  buttons,
});
const options = (id: string, heading: string, items: BlockOf<"options">["items"], extra: Partial<BlockOf<"options">> = {}): BlockOf<"options"> => ({
  id,
  type: "options",
  heading,
  columns: 2,
  showFullText: true,
  items,
  ...extra,
});
const choice = (eyebrow: string, title: string, paragraphs: string[], buttons: ButtonRef[]): BlockOf<"options">["items"][number] => ({
  eyebrow,
  title,
  doc: doc(...paragraphs),
  buttons,
});
const cta = (id: string, heading: string, text: string, buttons: ButtonRef[]): BlockOf<"cta"> => ({ id, type: "cta", heading, text, buttons, tone: "sand" });
const page = (title: string, intro: string, blocks: Block[]): PageDoc => ({ title, intro, seo: { description: intro }, blocks });

export const VISITOR_NAVIGATION: Settings["navigation"] = {
  main: [
    { label: "About Us", href: "/about", children: [{ label: "Our Impact & Reports", href: "/impact" }] },
    {
      label: "Our Programs",
      href: "/services",
      children: [
        { label: "Our Programs & Get Help", href: "/services" },
        { label: "Youth & Family Programs", href: "/youth" },
        { label: "Climate Justice Lab", href: "/climatejustice" },
      ],
    },
    { label: "Café & Catering", href: "/my-community-cafe", children: [] },
    { label: "Get Involved", href: "/get-involved", children: [] },
    { label: "News & Events", href: "/news", children: [] },
    { label: "Contact", href: "/contacts", children: [] },
  ],
};

export const VISITOR_QUICK_LINKS: Settings["quickLinks"] = {
  buttons: [button("Get Help", "/services"), button("Volunteer", "/volunteer", "secondary"), button("Donate", "/donate")],
};

export const VISITOR_PATHS = options(
  "visitor-paths",
  "How can we help you today?",
  [
    choice(
      "For our neighbors",
      "I need support",
      ["Find free groceries, healthcare, meals, and youth and family programs. See who each service is for and how to get started."],
      [button("Get Help", "/services")],
    ),
    choice(
      "For volunteers",
      "I want to give my time",
      ["Find a role at the pantry, clinic, youth programs or Climate Justice Lab, and go straight to the right signup."],
      [button("Find Volunteer Opportunities", "/volunteer")],
    ),
    choice(
      "For donors",
      "I want to make a difference",
      ["Give once, make a recurring gift, donate goods or explore a partnership. See the work your support makes possible."],
      [button("Donate", "/donate"), button("See Our Impact", "/impact", "link")],
    ),
  ],
  { columns: 3 },
);

const helpItems: BlockOf<"options">["items"] = [
  choice(
    "Walk in · Free groceries",
    "MY Family Pantry & Mid-Ohio Market",
    [
      "Free groceries and fresh food for neighbors and families facing food insecurity.",
      "How to get help: walk in during distribution hours. Bring your ID on your first visit to register. No online application is needed.",
      "Hours: Tuesday, Thursday and Saturday, 10 AM–2 PM; Wednesday, 3–7 PM. Check with the pantry about holiday changes.",
      "Where: Hilltop Youth Empowerment Center, 3275 Sullivant Ave., Columbus, OH 43204.",
    ],
    [button("Plan Your First Pantry Visit", "/services#option-get-help-0"), button("Call the Pantry", "tel:6148867849", "link")],
  ),
  choice(
    "Request an appointment · Free healthcare",
    "Hilltop Free Clinic",
    [
      "Preventive screenings, primary care and health navigation for eligible uninsured adults.",
      "How to get help: request an appointment. The clinic team will confirm eligibility, a date and the visit location. Sending a request does not book an appointment.",
      "Clinics run on select Saturdays. Contact the team for the next available session and what to bring. Interpretation is available.",
    ],
    [button("Request a Clinic Appointment", "/services#section-clinic-request"), button("Clinic Details & Languages", "/free-clinic", "link")],
  ),
  choice(
    "Walk in · Free meals",
    "The Community Table & MY Soup Kitchen",
    [
      "Free hot meals for neighbors who need them. This is the meal assistance program; café takeout and catering are separate paid services.",
      "How to get help: come during meal service. Meals are first come, first served; no online signup is required.",
      "Published meal hours: Tuesday–Saturday, noon–3 PM, at 3275 Sullivant Ave. Call before travelling to confirm the current schedule.",
    ],
    [button("Meal Program Details", "/community-table"), button("Confirm Meal Service", "tel:6149050977", "link")],
  ),
  choice(
    "Contact to enroll · Employment & English",
    "MY Pathways",
    [
      "Help with résumés, job applications, interview preparation, career guidance and conversational English for youth and adults.",
      "How to get help: email the Pathways team with the support you need. They will explain current classes, eligibility and enrollment.",
      "Class dates, locations and any intake requirements are to be confirmed with the team.",
    ],
    [button("Explore MY Pathways", "/services#option-get-help-3"), button("Ask About Enrollment", "mailto:Pathways@MYProjectUSA.org", "link")],
  ),
  choice(
    "Program registration · Youth & families",
    "Youth & Family Support",
    [
      "Explore MY Leaders Lab, MY Wellness Warriors, Climate Justice Warriors and Wellness Parents.",
      "How to take part: choose a program, check its audience and contact the youth team about current enrollment. Requirements differ by program.",
    ],
    [button("Explore Youth Programs", "/youth"), button("Ask the Youth Team", "mailto:Youth@MYProjectUSA.org", "link")],
  ),
  choice(
    "Contact first · Clothing & household goods",
    "Climate Justice Lab Community Resources",
    [
      "Ask about clothing, household goods, furniture and reusable items available through our sustainability and resource initiative.",
      "How to get help: contact the team before visiting. Appointments are required; availability and distribution requirements vary.",
      "Location: 4004 Fondorf Dr., Columbus, OH 43228.",
    ],
    [button("Explore the Climate Justice Lab", "/climatejustice"), button("Ask About Available Items", "mailto:admin4@MYProjectUSA.org", "link")],
  ),
];

export const PROGRAM_DIRECTORY = options(
  "program-directory",
  "Find a program or department",
  [
    choice(
      "Food & essentials",
      "MY Family Pantry & Mid-Ohio Market",
      ["Free groceries and fresh food. Walk in; bring ID to register on your first visit. Volunteer shifts are available through VolunteerHub."],
      [button("Get Groceries", "/services#option-get-help-0"), button("Volunteer at the Pantry", "https://mofb.volunteerhub.com/vv2/lp/MOMUSA", "link")],
    ),
    choice(
      "Food & essentials",
      "The Community Table & MY Soup Kitchen",
      ["Free meal assistance for neighbors. Walk in during meal service; check current hours before travelling."],
      [button("Get Meal Information", "/community-table"), button("Help Serve Meals", "/volunteer", "link")],
    ),
    choice(
      "Health & wellness",
      "Hilltop Free Clinic",
      ["Free preventive care, primary care and health navigation for eligible uninsured adults. Request an appointment or explore clinical volunteering."],
      [button("Request Care", "/services#section-clinic-request"), button("Join the Clinic Team", "/freeclinicteam", "link")],
    ),
    choice(
      "Health & wellness",
      "Wellness Parents & Resources",
      ["A support and learning community for Muslim parents and caregivers, with wellness education and connections to community resources."],
      [button("Explore Wellness Parents", "/wellness-parents"), button("Find Wellness Resources", "/wellnessresources", "link")],
    ),
    choice(
      "Youth & family",
      "MY Leaders Lab",
      ["The home of our youth leadership programs: hands-on service, advocacy, mentorship and projects that strengthen the community."],
      [button("Explore Youth Programs", "/youth"), button("Ask About Joining", "mailto:Youth@MYProjectUSA.org", "link")],
    ),
    choice(
      "Youth & family",
      "MY Wellness Warriors",
      ["Leadership and community wellness opportunities designed for Muslim high school students. Ask the team about the next program intake."],
      [button("Explore Wellness Warriors", "/wellnesswarriors"), button("Ask About Enrollment", "mailto:Youth@MYProjectUSA.org", "link")],
    ),
    choice(
      "Youth & family",
      "Climate Justice Warriors",
      ["Youth-led environmental action through reuse, recycling, refurbishing and service. Individual opportunities have their own age requirements."],
      [button("Explore Climate Justice", "/climatejustice"), button("Apply to Volunteer", "https://forms.gle/niTGaMjWLgPbnSGz6", "link")],
    ),
    choice(
      "Youth & family",
      "Hilltop Youth Garden",
      [
        "Grow food and learn about sustainability through community gardening alongside young leaders. Current sessions and participation details are available from the youth team.",
      ],
      [button("Ask About the Garden", "mailto:Youth@MYProjectUSA.org"), button("Youth Opportunities", "/youth", "link")],
    ),
    choice(
      "Jobs & education",
      "MY Pathways",
      ["Employment help, résumé and interview preparation, career guidance and conversational English. Contact the team for current classes and enrollment."],
      [button("Get Employment or English Support", "/services#option-get-help-3"), button("Contact Pathways", "mailto:Pathways@MYProjectUSA.org", "link")],
    ),
    choice(
      "Sustainability & reuse",
      "Climate Justice Lab",
      ["Our department for reuse, recycling, donated goods, environmental education and community resources. Visits and goods donations are by appointment."],
      [button("Explore the Lab", "/climatejustice"), button("Donate Goods", "/cjl-dropoff-locations", "link")],
    ),
    choice(
      "Social enterprises",
      "MY Community Café & Catering",
      ["Paid takeout and catering from our community café. Your order supports food access work. For free meals, visit the Community Table program."],
      [button("Explore Café & Catering", "/my-community-cafe"), button("Find Free Meals", "/community-table", "link")],
    ),
    choice(
      "Partnerships & advocacy",
      "Social Venture Partnerships",
      ["Support sustainable community programs through recurring giving, sponsorship and long-term business or institutional partnerships."],
      [button("Explore Partnerships", "/ventures"), button("Donate", "/donate", "link")],
    ),
    choice(
      "Partnerships & advocacy",
      "Advocacy & Community Resources",
      ["Learn about the issues our organization addresses and find education, advocacy and community resources."],
      [button("Explore Our Advocacy", "/issues"), button("Become a Partner", "/get-involved#section-partner", "link")],
    ),
  ],
  { searchable: true },
);

export const CLINIC_REQUEST: BlockOf<"form"> = {
  id: "clinic-request",
  type: "form",
  title: "Request a clinic appointment",
  intro: "Leave your contact details so the clinic team can follow up. Required fields are marked.",
  fields: [
    { id: "name", label: "Full name", type: "text", required: true },
    { id: "email", label: "Email", type: "email", required: false },
    { id: "phone", label: "Phone number", type: "tel", required: true },
    {
      id: "language",
      label: "Preferred language",
      type: "select",
      required: true,
      options: ["English", "Spanish", "French", "Haitian Creole", "Arabic", "Somali", "Another language — please call me"],
    },
    { id: "contact", label: "Best time and way to contact you", type: "text", required: false },
    { id: "acknowledge", label: "I understand this is a request and my appointment must be confirmed by the clinic team.", type: "checkbox", required: true },
  ],
  submitLabel: "Send Appointment Request",
  successMessage:
    "Your request has been received. This is not a confirmed appointment. Please wait for the clinic team to confirm your next step, or contact the clinic directly.",
  privacyNote: "Contact and scheduling details only. Requests are saved for authorized MY Project USA staff to review.",
};

export const ABOUT_SECTION_SOURCES = ["vision-mission-goals", "boa", "collaborators", "job-opportunities"];

export function buildVisitorPages(originals: Record<string, PageDoc> = {}): Record<string, PageDoc> {
  const pages: Record<string, PageDoc> = {
    services: page(
      "Our Programs & Get Help",
      "Find food, free healthcare, employment help and family support. See how to access each service before you visit.",
      [
        hero(
          "help-hero",
          "Support starts here.",
          "Find the help you need, see what to bring, and know whether to walk in, request an appointment or contact the team.",
          [button("Call for Help Finding a Service", "tel:6149050977"), button("Browse All Programs", "/services#section-program-directory", "secondary")],
        ),
        {
          id: "help-jumps",
          type: "buttons",
          align: "center",
          buttons: [
            button("Groceries", "#option-get-help-0", "secondary"),
            button("Healthcare", "#option-get-help-1", "secondary"),
            button("Hot Meals", "#option-get-help-2", "secondary"),
            button("Jobs & English", "#option-get-help-3", "secondary"),
            button("Youth & Families", "#option-get-help-4", "secondary"),
            button("Household Items", "#option-get-help-5", "secondary"),
          ],
        },
        options("get-help", "What do you need help with?", helpItems),
        CLINIC_REQUEST,
        PROGRAM_DIRECTORY,
        cta(
          "help-contact",
          "You don’t have to figure it out alone.",
          "If you are unsure which program fits, contact our team. We will help you find the next step.",
          [button("Contact Our Team", "/contacts"), button("Call 614-905-0977", "tel:6149050977", "secondary")],
        ),
      ],
    ),
    "get-involved": page("Get Involved", "Volunteer, bring your group, become a partner or support programs that strengthen our community.", [
      hero(
        "involved-hero",
        "Your time. Your community. Your project.",
        "Find a practical way to support youth and families, whether you have a few hours, professional skills or a team ready to help.",
        [button("Volunteer Opportunities & Signup", "/volunteer"), button("Donate", "/donate", "secondary")],
      ),
      options("groups", "Find the right way to help", [
        choice(
          "Individuals & students",
          "Find a volunteer role",
          [
            "Explore food distribution, clinic support, youth projects, gardening and sustainability. Each opportunity links to the appropriate application or coordinator.",
          ],
          [button("Find Volunteer Opportunities", "/volunteer")],
        ),
        choice(
          "Groups & corporate teams",
          "Bring your team",
          ["Ask about a service day, group opportunities and current needs. Contact the team with your group size, preferred dates and area of interest."],
          [button("Plan Group Volunteering", "/contacts"), button("General Volunteer Application", "https://forms.gle/iY7saKPC5zf9B6767", "link")],
        ),
      ]),
      VOLUNTEER_APPLICATION,
      options("partner", "Build something lasting with us", [
        choice(
          "Businesses, schools & community groups",
          "Become a partner",
          ["Connect your organization with youth leadership, food access, healthcare, education or sustainability. Tell us the program you want to support."],
          [button("Contact Us About Partnering", "/contacts"), button("Our Collaborators", "/collaborators", "link")],
        ),
        choice(
          "Donors & sponsors",
          "Invest in our community",
          ["Explore giving, event and program sponsorship, and long-term Social Venture Partnerships."],
          [button("Explore Social Venture Partnerships", "/ventures"), button("Donate", "/donate", "link")],
        ),
      ]),
      PARTNER_INQUIRY,
      cta(
        "involved-goods",
        "Have goods to donate?",
        "Find current drop-off instructions through the Climate Justice Lab. Contact the team to arrange an appointment before bringing items.",
        [button("Goods Donation & Drop-off", "/cjl-dropoff-locations")],
      ),
      cta("involved-news", "Stay connected to the work.", "Explore news and events, or subscribe for program updates and opportunities.", [
        button("News & Events", "/news"),
        button("Subscribe", "/contact-8-1", "secondary"),
      ]),
    ]),
    about: page("About Us", "Learn about our mission, the people behind the work and our commitment to our community.", [
      hero(
        "about-hero",
        "Protect. Educate. Empower Our Youth.",
        "MY Project USA strengthens families and neighborhoods while creating opportunities for youth in Central Ohio.",
        [button("Our Story, Mission & Vision", "/vision-mission-goals"), button("See Our Impact", "/impact", "secondary")],
      ),
      options("about-explore", "Get to know MY Project USA", [
        choice(
          "Our people",
          "Leadership & team",
          ["Meet the people and advisors guiding our youth and community programs."],
          [button("Meet Our Team", "/team"), button("Board of Advisors", "/boa", "link")],
        ),
        choice(
          "Our community",
          "Partners & collaborators",
          ["Meet the organizations working alongside us and explore how to partner with MY Project USA."],
          [button("Our Collaborators", "/collaborators"), button("Become a Partner", "/get-involved#section-partner", "link")],
        ),
        choice(
          "Our accountability",
          "Impact & recognition",
          ["Explore reports, community outcomes and the recognition of young leaders and supporters."],
          [button("Impact & Reports", "/impact"), button("Awards & Recognition", "/awards", "link")],
        ),
        choice(
          "Our opportunities",
          "Work with us",
          ["Find current job opportunities and other ways to contribute to our mission."],
          [button("View Careers", "/job-opportunities"), button("Volunteer", "/volunteer", "link")],
        ),
      ]),
      TEAM_PLACEHOLDERS,
    ]),
    impact: page("Our Impact & Reports", "Explore our community impact, reports and the programs made possible by supporters and volunteers.", [
      hero(
        "impact-hero",
        "See the work your support makes possible.",
        "Youth leadership, food access, healthcare and family support come together to strengthen our community.",
        [button("Read Our Reports", "/reports"), button("Support Our Work", "/donate", "secondary")],
      ),
      options("impact-explore", "Explore our impact", [
        choice(
          "Reports & accountability",
          "Read the source",
          ["Find the organization’s published reports and learn about our work over time."],
          [button("View Reports", "/reports")],
        ),
        choice(
          "Stories & community",
          "Follow the work",
          ["See program updates, media coverage and community stories."],
          [button("News & Events", "/news"), button("Explore Our Programs", "/services#section-program-directory", "link")],
        ),
      ]),
      { id: "impact-reports", type: "collection", collection: "reports", heading: "Reports & financial documents", limit: 30, display: "grid" },
      {
        id: "impact-funds",
        type: "richText",
        layout: "default",
        doc: doc(
          "Donations support our work with youth, families and neighbors. Read the published reports for details about program activity and finances, or contact our team with questions about a specific gift.",
          "An updated financial breakdown and additional community stories will be added once approved. We publish personal stories and photographs with permission.",
        ),
      },
    ]),
    news: page("News & Events", "Find upcoming events, community updates, news coverage and newsletters in one place.", [
      hero(
        "news-hero",
        "Stay close to your community.",
        "Find your next event, follow our programs and catch up on the work happening across MY Project USA.",
        [button("Upcoming Events", "/events-2"), button("Subscribe to Updates", "/contact-8-1", "secondary")],
      ),
      options("news-explore", "What would you like to explore?", [
        choice(
          "Take part",
          "Upcoming events",
          ["Explore current event announcements and follow each event’s registration instructions."],
          [button("Find Upcoming Events", "/events-2")],
        ),
        choice(
          "In the community",
          "News & media coverage",
          ["Read coverage of our programs and the people driving our work."],
          [button("Read News Coverage", "/copy-of-news-coverage")],
        ),
        choice(
          "In your inbox",
          "Newsletters",
          ["Catch up on program updates, announcements and opportunities to help."],
          [button("Read Newsletters", "/newsletter"), button("Subscribe", "/contact-8-1", "link")],
        ),
        choice(
          "Our history",
          "Past events & stories",
          ["Explore previous events and stories from our community."],
          [button("Past Events", "/events"), button("Read Our Blog", "/blog", "link")],
        ),
      ]),
      { id: "news-coverage", type: "collection", collection: "news", heading: "Media coverage", limit: 6, display: "grid" },
      { id: "news-stories", type: "collection", collection: "articles", heading: "Stories & program updates", limit: 6, display: "grid" },
      cta("media-contact", "Media inquiries", "For press, interviews or permission to use a story or image, contact our team.", [
        button("Contact MY Project USA", "/contacts"),
      ]),
    ]),
    privacy: policyPlaceholder("Privacy", "privacy"),
    terms: policyPlaceholder("Terms", "terms"),
    accessibility: policyPlaceholder("Accessibility", "accessibility"),
  };
  for (const source of ABOUT_SECTION_SOURCES) {
    if (originals[source]) pages.about.blocks.push(...originals[source].blocks.map((block) => ({ ...block, id: `about-${source}-${block.id}` })));
  }
  for (const block of originals[""]?.blocks ?? []) if (block.type === "stats") pages.impact.blocks.push({ ...block, id: "impact-highlights" });
  return pages;
}

/** Keep existing CMS content and photography, while putting the three visitor paths first. */
export function reorganizeHome(original: PageDoc): PageDoc {
  const blocks = original.blocks.filter((b) => !["visitor-paths", "home-service-preview", "home-directory", "home-enterprises", "home-news"].includes(b.id));
  const heroIndex = blocks.findIndex((b) => b.type === "hero");
  if (heroIndex >= 0) {
    const block = blocks[heroIndex] as BlockOf<"hero">;
    blocks[heroIndex] = {
      ...block,
      buttons: [button("Get Help", "/services"), button("Donate", "/donate", "secondary"), button("Volunteer", "/volunteer", "link")],
    };
  }
  blocks.splice(heroIndex >= 0 ? heroIndex + 1 : 0, 0, VISITOR_PATHS);
  const programIndex = blocks.findIndex((b) => b.type === "programs");
  blocks.splice(
    programIndex >= 0 ? programIndex + 1 : 2,
    0,
    {
      id: "home-directory",
      type: "buttons",
      align: "center",
      buttons: [button("All Programs & Departments", "/services#section-program-directory", "secondary")],
    },
    options("home-service-preview", "Need support? Start here.", helpItems.slice(0, 3), { columns: 3 }),
  );
  const enterpriseIndex = blocks.findIndex((b) => b.type === "stats");
  blocks.splice(
    enterpriseIndex >= 0 ? enterpriseIndex + 1 : blocks.length,
    0,
    options("home-enterprises", "More ways to be part of the community", [
      choice(
        "Café & catering",
        "A good meal that gives back",
        ["Order paid café takeout, ask about catering or learn how the café supports food access work."],
        [button("Explore the Café", "/my-community-cafe")],
      ),
      choice(
        "Volunteer & partner",
        "Bring your time, skills or team",
        ["Explore individual and group volunteering, community partnerships and sponsorship."],
        [button("Get Involved", "/get-involved")],
      ),
    ]),
  );
  blocks.push(
    cta("home-news", "There’s a place for you here.", "See upcoming events, volunteer opportunities and the latest community updates.", [
      button("News & Events", "/news"),
      button("Get Involved", "/get-involved", "secondary"),
    ]),
  );
  return { ...original, blocks };
}

export const CLINIC_NEXT_STEPS = options("clinic-next-steps", "How to get care", [
  choice(
    "For patients",
    "Request an appointment",
    [
      "Request a visit and let the clinic team confirm eligibility, the next clinic date and your visit location. Interpretation is available.",
      "Your appointment confirmation will include the visit location. Please confirm where to come before travelling.",
    ],
    [button("Request a Clinic Appointment", "/services#section-clinic-request"), button("Email the Clinic", "mailto:FreeClinic@MYProjectUSA.org", "link")],
  ),
  choice(
    "For volunteers",
    "Join the clinic team",
    ["Medical students, undergraduates, healthcare professionals and interpreters can explore the clinic’s volunteer opportunities."],
    [button("Clinic Volunteer Applications", "/freeclinicteam")],
  ),
]);

export const VOLUNTEER_START = options("volunteer-start", "Ready to volunteer? Start here.", [
  choice(
    "Not sure which role fits?",
    "General volunteering",
    ["Apply once and share your interests, skills and availability. Use the department applications below if you already know where you want to help."],
    [button("Complete the Volunteer Application", "https://forms.gle/iY7saKPC5zf9B6767")],
  ),
  choice(
    "Choose a department",
    "Go straight to your team",
    [
      "Pantry volunteers can choose shifts on VolunteerHub. Clinic volunteers use the clinic application. Explore youth, garden and climate opportunities below.",
      "Some listings refer to previous seasonal programs. Confirm current openings and dates with the coordinator before applying.",
    ],
    [button("Sign Up for a Pantry Shift", "https://mofb.volunteerhub.com/vv2/lp/MOMUSA"), button("Clinic Volunteer Applications", "/freeclinicteam", "link")],
  ),
]);

export const YOUTH_NEXT_STEPS = options("youth-next-steps", "Choose your next step", [
  choice(
    "For youth & families",
    "Join a youth program",
    [
      "Explore MY Leaders Lab initiatives below. MY Wellness Warriors is designed for Muslim high school students; eligibility varies for other programs.",
      "Current enrollment dates, age requirements, parent or guardian consent, meeting times and locations need confirmation for each program.",
    ],
    [
      button("Ask About Youth Enrollment", "mailto:Youth@MYProjectUSA.org"),
      button("All Youth & Family Programs", "/services#section-program-directory", "link"),
    ],
  ),
  choice(
    "For volunteers & supporters",
    "Help young people thrive",
    ["Give your time, mentor young leaders or support youth projects with a donation."],
    [button("Explore Volunteer Opportunities", "/volunteer"), button("Support Youth Programs", "/donate", "link")],
  ),
]);

export const TEAM_PLACEHOLDERS: BlockOf<"cards"> = {
  id: "team-profiles",
  type: "cards",
  heading: "Meet the people behind the work",
  intro: "Team profiles are being updated. Names, roles, biographies and portraits will be added after confirmation.",
  style: "text",
  columns: 3,
  items: [
    { title: "Organization leadership", text: "Profile coming soon: confirmed name, title, short biography and approved portrait." },
    { title: "Department leadership", text: "Profiles coming soon: department leads, their roles, short biographies and approved portraits." },
    {
      title: "Youth & volunteer leadership",
      text: "Profiles coming soon: youth and volunteer leaders, their roles, short biographies and approved portraits.",
    },
  ],
};

export const CAFE_NEXT_STEPS = options("cafe-next-steps", "What brings you to the café?", [
  choice(
    "Paid café orders",
    "Takeout & catering",
    [
      "Enjoy food from MY Community Café or ask about catering for a gathering.",
      "The current menu, ordering link, hours and catering lead times need confirmation. Call the team before placing an order.",
    ],
    [button("Call About Takeout or Catering", "tel:6149050977")],
  ),
  choice(
    "Free meal assistance",
    "Looking for a free meal?",
    ["The Community Table and MY Soup Kitchen provide free meal assistance. See meal service information and confirm the current schedule."],
    [button("Find Free Meals", "/community-table"), button("All Free Services", "/services", "link")],
  ),
]);

export const VOLUNTEER_APPLICATION: BlockOf<"form"> = {
  id: "volunteer-application",
  type: "form",
  title: "Apply to volunteer",
  intro: "Share how you would like to help. For scheduled pantry shifts or clinic roles, use the department’s signup link on our volunteer opportunities page.",
  fields: [
    { id: "name", label: "Full name", type: "text", required: true },
    { id: "email", label: "Email", type: "email", required: true },
    { id: "phone", label: "Phone number", type: "tel", required: false },
    {
      id: "type",
      label: "I am volunteering as",
      type: "select",
      required: true,
      options: ["An individual", "A student", "A group or corporate team", "A healthcare professional", "A school or community group"],
    },
    {
      id: "interest",
      label: "Area of interest",
      type: "select",
      required: true,
      options: [
        "Food pantry",
        "Meal service",
        "Youth & family programs",
        "Hilltop Free Clinic",
        "Climate Justice Lab",
        "Garden",
        "Events",
        "Wherever I am needed",
      ],
    },
    { id: "availability", label: "Availability, skills or group details", type: "textarea", required: false },
  ],
  submitLabel: "Send Volunteer Application",
  successMessage: "Your application has been received for staff review. The volunteer team will confirm opportunities and next steps.",
  privacyNote: "Your application is saved for authorized MY Project USA staff to review.",
};

export const PARTNER_INQUIRY: BlockOf<"form"> = {
  id: "partnership-inquiry",
  type: "form",
  title: "Ask about a partnership or sponsorship",
  fields: [
    { id: "name", label: "Full name", type: "text", required: true },
    { id: "email", label: "Email", type: "email", required: true },
    { id: "organization", label: "Organization", type: "text", required: false },
    { id: "message", label: "How would you like to partner with us?", type: "textarea", required: true },
  ],
  submitLabel: "Send Partnership Inquiry",
  successMessage: "Your inquiry has been received for staff review. Thank you for your interest in partnering with MY Project USA.",
  privacyNote: "Your inquiry is saved for authorized MY Project USA staff to review.",
};

export const CAFE_MENU = options("cafe-menu", "Menu & ordering", [
  choice(
    "Menu update in progress",
    "Today’s menu",
    [
      "Our current menu, item prices and food photographs are being updated. Call the café to ask what is available today.",
      "Pickup is at the Hilltop Youth Empowerment Center, 3275 Sullivant Ave., Columbus, OH 43204. Please confirm pickup hours with the café.",
    ],
    [button("Call About the Menu & Ordering", "tel:6149050977")],
  ),
  choice(
    "Order information to be confirmed",
    "Takeout, delivery & seasonal offers",
    [
      "Online ordering and active delivery links will be added after confirmation. Contact the café to arrange an order in the meantime.",
      "Ask about seasonal iftar offers. Current packages, dates and availability need confirmation.",
    ],
    [button("Call to Arrange an Order", "tel:6149050977")],
  ),
]);

export const CATERING_INQUIRY: BlockOf<"form"> = {
  id: "catering",
  type: "form",
  title: "Ask about catering",
  intro:
    "Tell us about your gathering. Packages, prices, serving sizes, minimum orders and advance notice will be confirmed by the café. Sending this inquiry does not place an order.",
  fields: [
    { id: "name", label: "Full name", type: "text", required: true },
    { id: "email", label: "Email", type: "email", required: true },
    { id: "phone", label: "Phone number", type: "tel", required: false },
    { id: "event", label: "Event date, guest count and catering needs", type: "textarea", required: true },
  ],
  submitLabel: "Send Catering Inquiry",
  successMessage: "Your catering inquiry has been received for staff review. Your order is not placed until the café confirms the details.",
  privacyNote: "Your inquiry is saved for authorized MY Project USA staff to review.",
};

export const YOUTH_FAMILY = options("youth-family", "Families, resources & issues we address", [
  choice(
    "Parents & caregivers",
    "Wellness Parents",
    ["Connect with a Muslim parent and caregiver community for learning, conversations and resources supporting youth and family wellness."],
    [
      button("Join Wellness Parents", "https://docs.google.com/forms/d/e/1FAIpQLScU_4928A5WJYpCuvlmefUboa0upBmqu7_2a47I2Gd4CjLdqg/viewform"),
      button("Wellness Resources", "/wellnessresources", "link"),
    ],
  ),
  choice(
    "Issues we address",
    "Connect a challenge to a next step",
    [
      "Food insecurity connects to our pantry and meal programs. Barriers to healthcare connect to the free clinic. Youth wellness and environmental challenges connect to MY Leaders Lab, Wellness Warriors and Climate Justice Lab.",
    ],
    [button("Find Services & Resources", "/services"), button("Learn About Our Advocacy", "/issues", "link")],
  ),
]);

export const YOUTH_ENROLLMENT = options("youth-enrollment", "Youth programs & registration", [
  choice(
    "Muslim high school students",
    "MY Wellness Warriors",
    [
      "Build leadership skills, learn about community wellness, connect with mentors and take part in youth-led activities.",
      "Email the program team to ask about the next intake, meeting times, age requirements and parent or guardian consent.",
    ],
    [button("Ask to Join Wellness Warriors", "mailto:wellness@myprojectusa.org"), button("Program Details", "/wellnesswarriors", "link")],
  ),
  choice(
    "Youth leadership & sustainability",
    "Climate Justice Warriors",
    [
      "Get hands-on experience in environmental action, reuse and community service through MY Leaders Lab.",
      "Use the program’s join form and ask the team to confirm current dates, eligibility and consent requirements.",
    ],
    [
      button("Join Climate Justice Lab", "https://docs.google.com/forms/d/e/1FAIpQLSffojVBwH8u4WfjJWz1C6J5pyD1gPub5E1txHv1VdpWYxorSQ/viewform"),
      button("Program Details", "/climatejustice", "link"),
    ],
  ),
]);

export const CLIMATE_NEXT_STEPS = options("climate-next-steps", "Visit, donate or take part", [
  choice(
    "Goods donations & community resources",
    "Arrange an appointment",
    [
      "The Climate Justice Lab brings reuse, recycling, refurbishing, donated goods and environmental education together at 4004 Fondorf Dr., Columbus, OH 43228.",
      "Contact the team before visiting. Confirm accepted items, condition requirements and drop-off arrangements before bringing a donation. Community distribution depends on available items.",
    ],
    [button("Donation & Drop-off Instructions", "/cjl-dropoff-locations"), button("Arrange a Visit", "mailto:admin4@MYProjectUSA.org", "link")],
  ),
  choice(
    "Climate Justice Warriors",
    "Put your time into action",
    ["Join youth-led environmental work through reuse, recycling and hands-on community projects. Ask about current dates and age requirements."],
    [button("Apply to Volunteer", "https://forms.gle/niTGaMjWLgPbnSGz6"), button("Explore Youth Programs", "/youth", "link")],
  ),
]);

export const PAGE_EXTRAS: Record<string, Block[]> = {
  youth: [YOUTH_ENROLLMENT, YOUTH_FAMILY],
  "my-community-cafe": [CAFE_MENU, CATERING_INQUIRY],
  climatejustice: [CLIMATE_NEXT_STEPS],
};

function policyPlaceholder(title: string, subject: string): PageDoc {
  return {
    ...page(title, `Contact MY Project USA with questions about ${subject}.`, [
      {
        id: `${subject}-pending`,
        type: "richText",
        layout: "default",
        doc: doc(
          `Our approved ${subject} information is being prepared for this website. Please contact MY Project USA for the current information or to request assistance.`,
        ),
      },
      cta(`${subject}-contact`, "We’re here to help.", "Contact our team with questions or feedback, or for help accessing information on this website.", [
        button("Contact Us", "/contacts"),
      ]),
    ]),
    seo: { noindex: true },
  };
}

export const PAGE_INTROS: Record<string, Block> = {
  "free-clinic": CLINIC_NEXT_STEPS,
  volunteer: VOLUNTEER_START,
  youth: YOUTH_NEXT_STEPS,
  "my-community-cafe": CAFE_NEXT_STEPS,
};

export function reorganizePage(path: string, original: PageDoc): PageDoc {
  if (path === "") return reorganizeHome(original);
  if (path === "services") return buildVisitorPages().services;
  const intro = PAGE_INTROS[path];
  const extras = PAGE_EXTRAS[path] ?? [];
  if (intro || extras.length) {
    const ids = new Set([intro?.id, ...extras.map((b) => b.id)]);
    const blocks = original.blocks.filter((b) => !ids.has(b.id));
    if (intro) blocks.splice(blocks[0]?.type === "hero" ? 1 : 0, 0, intro);
    blocks.push(...extras);
    let updated = { ...original, blocks };
    if (path === "youth") updated = { ...updated, title: "Youth & Family Programs" };
    if (path === "my-community-cafe") updated = { ...updated, title: "MY Community Café & Catering" };
    if (path === "free-clinic") {
      updated = { ...updated, title: "Hilltop Free Clinic", hideTitle: false };
      updated = JSON.parse(
        JSON.stringify(updated).replaceAll(
          "We are located at 3725 Sullivant Avenue, Columbus, OH, 43204 at the MY Project USA Center.",
          "Please confirm your visit location with the clinic team before travelling.",
        ),
      ) as PageDoc;
    }
    return updated;
  }
  if (path === "team" && !original.blocks.some((b) => b.id === TEAM_PLACEHOLDERS.id)) return { ...original, blocks: [...original.blocks, TEAM_PLACEHOLDERS] };
  return original;
}
