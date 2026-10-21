# URL migration map

Every original address keeps working. Pages keep their **exact original path** (e.g. `/vision-mission-goals`, `/copy-of-news-coverage`) so existing links, bookmarks and search results don't break.
Addresses that changed are permanently redirected (HTTP 301) by the Worker. Redirects are stored in the database and listed in the admin under **Redirects**.

## Rules applied by the Worker (in addition to the table below)

| Old pattern | Goes to | Why |
|---|---|---|
| `/ar/…`, `/es/…`, `/fr/…`, `/ht/…`, `/so/…` (no translation exists) | the English page (302) | Wix served English content at these addresses; only the Free Clinic pages had real translations, and those are kept at `/{lang}/free-clinic` and `/{lang}/freeclinicteam` |
| `/events-1/*`, `/events-3/*` not in the table | `/events` | Wix event pages |
| `/single-post/*`, `/blog/tags/*`, `/blog/archive/*` not in the table | `/blog` | Wix blog pages |
| `/product-page/*`, `/shop`, `/cart` | `/` | Wix Stores template placeholders (no real products) |
| Any path with a trailing slash | same path without it | one canonical URL per page |

## Pages kept at the same address (86)

| Address |
|---|
| / |
| /about-youth-bod |
| /ar/free-clinic |
| /ar/freeclinicteam |
| /award-nominations |
| /awards |
| /awards/2026honorees |
| /blog |
| /boa |
| /cjl-dropoff-locations |
| /climatejustice |
| /collaborators |
| /community-table |
| /conference-speakers |
| /contact-8-1 |
| /contacts |
| /copy-of-muslims-against-female-geni |
| /copy-of-news-coverage |
| /copy-of-youth |
| /covid-19-response-center |
| /donate-online |
| /donors |
| /es/free-clinic |
| /es/freeclinicteam |
| /event-flyers |
| /event-my-leaders-summer-camp-2015 |
| /event-ramadan-2015-food-toys-drive |
| /events |
| /events-2 |
| /events-registration |
| /fgm |
| /fr/free-clinic |
| /fr/freeclinicteam |
| /free-clinic |
| /freeclinicteam |
| /helpers-1 |
| /helpline |
| /hilltopsustainability |
| /ht/free-clinic |
| /ht/freeclinicteam |
| /iftaar-fundraiser |
| /issues |
| /job-opportunities |
| /join-helpers-network |
| /join-us |
| /join-us-myleaders |
| /local-chapters-1 |
| /muslims-against-human-trafficking |
| /my-community-cafe |
| /my-earth-action-day-3 |
| /my-leaders-camp-registraion |
| /myp-cscc-conference2017 |
| /myp-cscc-conference2017-program |
| /myp-cscc-conference2017-speakers |
| /news-coverage |
| /newsletter |
| /old-donors-2 |
| /old-donors-page |
| /old-youth-page |
| /parent-sign-up |
| /parents |
| /partners |
| /ppe |
| /press-release |
| /professional-development |
| /register-homosexuality-forum |
| /register-national-earth-day |
| /register-social-media-campaign |
| /reports |
| /research |
| /services |
| /siblings |
| /stopfgm |
| /summer |
| /team |
| /ventures |
| /vision-mission-goals |
| /volunteer |
| /wellness-parents |
| /wellnessresources |
| /wellnesswarriors |
| /youth |
| /youth-board-application |
| /youth-bod |
| /youth-conference-16 |
| /zakat-eligibility |

## Redirects (372)

| Old address | New address |
|---|---|
| /blog/archive/2015/02 | /blog |
| /blog/archive/2015/03 | /blog |
| /blog/archive/2015/05 | /blog |
| /blog/archive/2015/07 | /blog |
| /blog/archive/2015/09 | /blog |
| /blog/archive/2015/10 | /blog |
| /blog/tags/abdifatah-mohamud | /blog |
| /blog/tags/abdullah-saleem | /blog |
| /blog/tags/chicago | /blog |
| /blog/tags/child-abuse | /blog |
| /blog/tags/child-molestation | /blog |
| /blog/tags/ciogc | /blog |
| /blog/tags/community-development | /blog |
| /blog/tags/domestic-abuse | /blog |
| /blog/tags/drugs | /blog |
| /blog/tags/family-violence | /blog |
| /blog/tags/gangs | /blog |
| /blog/tags/heart-for-women-girls | /blog |
| /blog/tags/human-trafficking | /blog |
| /blog/tags/institute-of-islamic-education | /blog |
| /blog/tags/justicenotsilence | /blog |
| /blog/tags/kaiseruddin | /blog |
| /blog/tags/khalil-wimes | /blog |
| /blog/tags/mother-s-day | /blog |
| /blog/tags/muslim-community | /blog |
| /blog/tags/muslim-domestic-violence | /blog |
| /blog/tags/muslim-families | /blog |
| /blog/tags/muslim-mother-in-law | /blog |
| /blog/tags/muslim-mothers | /blog |
| /blog/tags/muslim-refugees | /blog |
| /blog/tags/my-parents-network | /blog |
| /blog/tags/my-project-usa | /blog |
| /blog/tags/nadia-mohajir | /blog |
| /blog/tags/parenting | /blog |
| /blog/tags/poverty | /blog |
| /blog/tags/sex-trafficking | /blog |
| /blog/tags/sexual-abuse | /blog |
| /blog/tags/soup-kitchen | /blog |
| /blog/tags/winter-clothes-drive | /blog |
| /blog/tags/youth-empowerment | /blog |
| /contact-8 | /contacts |
| /event---my-leaders-summer-camp-2015 | /event-my-leaders-summer-camp-2015 |
| /events-1 | /events |
| /events-1/"the-narratives-of-resilience" | /events/the-narratives-of-resilience |
| /events-1/#myprojectisusa 2016---my-first-community-leadership-conference | /events/myprojectisusa-2016-my-first-community-leadership-conference |
| /events-1/&quot;thanks-is-giving&quot;-kick-off-event | /events/thanks-is-giving-kick-off-event |
| /events-1/-columbus-interfaith-ramadan-iftar | /events/columbus-interfaith-ramadan-iftar |
| /events-1/2017-eid-open-house-for-refugees-families | /events/2017-eid-open-house-for-refugees-families |
| /events-1/2nd-annual-youth-conference:-uplifting-our-neighborhoods---organizing-our-communities | /events/2nd-annual-youth-conference-uplifting-our-neighborhoods-organizing-our-communiti |
| /events-1/2nd-columbus-unity-meeting---immigrants-in-trumpland | /events/2nd-columbus-unity-meeting-immigrants-in-trumpland |
| /events-1/7-secrets-of-the-world's-most-successful-professional-muslims | /events/7-secrets-of-the-worlds-most-successful-professional-muslims |
| /events-1/7th-annual-neighborhood-best-practices-conference | /events/7th-annual-neighborhood-best-practices-conference |
| /events-1/a-benefit-dinner-to-protect-&-empower-columbus-youth-&-parents- | /events/a-benefit-dinner-to-protect-and-empower-columbus-youth-and-parents |
| /events-1/bake-sale-at-my-family-pantry | /events/bake-sale-at-my-family-pantry |
| /events-1/clothes-swap-for-eid-toys | /events/clothes-swap-for-eid-toys |
| /events-1/columbus-city-council-passes-a-resolution-against-islamophobia | /events/columbus-city-council-passes-a-resolution-against-islamophobia |
| /events-1/columbus-dads-meeting-for-wedgewood-kids | /events/columbus-dads-meeting-for-wedgewood-kids |
| /events-1/columbus-earth-action-day-two | /events/columbus-earth-action-day-two |
| /events-1/columbus-fasting-5k-2018-to-support-wedgewood-youth-&-families | /events/columbus-fasting-5k-2018-to-support-wedgewood-youth-and-families |
| /events-1/columbus-interfaith-ramadan-iftar-dinner-2019 | /events/columbus-interfaith-ramadan-iftar-dinner-2019 |
| /events-1/columbus-moms-meeting-for-wedgewood-kids | /events/columbus-moms-meeting-for-wedgewood-kids |
| /events-1/columbus-muslim-youth-retreat-2017 | /events/columbus-muslim-youth-retreat-2017 |
| /events-1/columbus-rally-for-expanded-sanctuary | /events/columbus-rally-for-expanded-sanctuary |
| /events-1/dare-to-care-volunteer-training | /events/dare-to-care-volunteer-training |
| /events-1/dayton-benefit-dinner-with-mayor-nan-whaley- | /events/dayton-benefit-dinner-with-mayor-nan-whaley |
| /events-1/dayton-muslim-domestic-violence-advocates-training | /events/dayton-muslim-domestic-violence-advocates-training |
| /events-1/dayton-muslim-youth-summit---discover-yourself:-create-your-footprints- | /events/dayton-muslim-youth-summit-discover-yourself-create-your-footprints |
| /events-1/dayton-muslims-mlk-event:-i-am-a-keeper | /events/dayton-muslims-mlk-event-i-am-a-keeper |
| /events-1/drugs,-gangs,-human-trafficking-&-muslim-youth---isna-roundtable | /events/drugs-gangs-human-trafficking-and-muslim-youth-isna-roundtable |
| /events-1/eakin-elementary-end-of-year-celebrations | /events/eakin-elementary-end-of-year-celebrations |
| /events-1/earth-action-days:-neighborhood-spruce-up-and-celebrations | /events/earth-action-days-neighborhood-spruce-up-and-celebrations |
| /events-1/eid-al-adha-food-basket-drive-2016 | /events/eid-al-adha-food-basket-drive-2016 |
| /events-1/eid-al-adha-mubarak | /events/eid-al-adha-mubarak |
| /events-1/eid-open-house-2017 | /events/eid-open-house-2017 |
| /events-1/emergency-rally-in-columbus,-oh | /events/emergency-rally-in-columbus-oh |
| /events-1/engaging-in-a-healthy-parent/teacher-relationship | /events/engaging-in-a-healthy-parent-teacher-relationship |
| /events-1/feed-the-needy-on-the-day-of-arafat | /events/feed-the-needy-on-the-day-of-arafat |
| /events-1/feed-the-needy-on-the-day-of-arafat-2016 | /events/feed-the-needy-on-the-day-of-arafat-2016 |
| /events-1/feeding-the-needy-on-the-day-of-arafat-2016 | /events/feeding-the-needy-on-the-day-of-arafat-2016 |
| /events-1/free-esl-classes-in-dayton | /events/free-esl-classes-in-dayton |
| /events-1/from-dr.-king-to-our-three-winners-to--our-future | /events/from-dr-king-to-our-three-winners-to-our-future |
| /events-1/healthy-and-moving,-2020 | /events/healthy-and-moving-2020 |
| /events-1/hilltop-spruce-up-&-celebrations | /events/hilltop-spruce-up-and-celebrations |
| /events-1/hilltop-youth-soccer-summer-league-awards-nights! | /events/hilltop-youth-soccer-summer-league-awards-nights |
| /events-1/homosexuality-and-muslim-americans | /events/homosexuality-and-muslim-americans |
| /events-1/honoring-&-celebrating-mayor-nan-whaley---annual-dinner-2019 | /events/honoring-and-celebrating-mayor-nan-whaley-annual-dinner-2019 |
| /events-1/iftaar-dinner-17-to-support-orphans,-refugees-&-needy-in-columbus | /events/iftaar-dinner-17-to-support-orphans-refugees-and-needy-in-columbus |
| /events-1/iftaar-dinner-to-support-orphans,-refugees-&-needy-in-columbus | /events/iftaar-dinner-to-support-orphans-refugees-and-needy-in-columbus |
| /events-1/iftaar-fundraiser:-"furthering-their-legacies"-with-farris-barakat | /events/iftaar-fundraiser-furthering-their-legacies-with-farris-barakat |
| /events-1/iftaar-kitchen-2017-week-2 | /events/iftaar-kitchen-2017-week-2 |
| /events-1/iftaar-kitchen-2017-week-2-day-1 | /events/iftaar-kitchen-2017-week-2-day-1 |
| /events-1/iftaar-kitchen-2017-week-3- | /events/iftaar-kitchen-2017-week-3 |
| /events-1/iftaar-kitchen-2017-week-4 | /events/iftaar-kitchen-2017-week-4 |
| /events-1/interfaith-celebration-of-mothers | /events/interfaith-celebration-of-mothers |
| /events-1/interfaith-vigil-for-new-zealand-victims-and-rally-against-hate | /events/interfaith-vigil-for-new-zealand-victims-and-rally-against-hate |
| /events-1/interfaith-vigil-for-victims-of-islamophobia | /events/interfaith-vigil-for-victims-of-islamophobia |
| /events-1/internet-safety-for-the-family | /events/internet-safety-for-the-family |
| /events-1/mandated-reporter-training | /events/mandated-reporter-training |
| /events-1/mlk-march | /events/mlk-march |
| /events-1/muslim-leaders-dinner-by-ncrc | /events/muslim-leaders-dinner-by-ncrc |
| /events-1/muslim-youth-townhall | /events/muslim-youth-townhall |
| /events-1/my-deah's-goodwill-store---volunteers-needed | /events/my-deahs-goodwill-store-volunteers-needed |
| /events-1/my-deah's-goodwill-store-reorganization | /events/my-deahs-goodwill-store-reorganization |
| /events-1/my-deah's-reorganizing-day | /events/my-deahs-reorganizing-day |
| /events-1/my-deah's-warehouse---sorting-week-kick-off | /events/my-deahs-warehouse-sorting-week-kick-off |
| /events-1/my-earth-action-day-3 | /events/my-earth-action-day-3 |
| /events-1/my-earth-action-day-4 | /events/my-earth-action-day-4 |
| /events-1/my-earth-action-day-5 | /events/my-earth-action-day-5 |
| /events-1/my-earth-action-day-6 | /events/my-earth-action-day-6 |
| /events-1/my-eid-drive-2016 | /events/my-eid-drive-2016 |
| /events-1/my-eid-goodwill-bazaar | /events/my-eid-goodwill-bazaar |
| /events-1/my-eid-toys-drive-2015 | /events/my-eid-toys-drive-2015 |
| /events-1/my-eid-toys-drive-2016 | /events/my-eid-toys-drive-2016 |
| /events-1/my-eid-toys-drive-2017---a-happy-eid-for-every-kid | /events/my-eid-toys-drive-2017-a-happy-eid-for-every-kid |
| /events-1/my-eid-toys-drive-2018 | /events/my-eid-toys-drive-2018 |
| /events-1/my-family-pantry | /events/my-family-pantry |
| /events-1/my-family-pantry's-first-anniversary-celebration- | /events/my-family-pantrys-first-anniversary-celebration |
| /events-1/my-family-pantry-day-#22 | /events/my-family-pantry-day-22 |
| /events-1/my-family-pantry-day-#23 | /events/my-family-pantry-day-23 |
| /events-1/my-family-pantry-day-#24 | /events/my-family-pantry-day-24 |
| /events-1/my-family-pantry-day-19 | /events/my-family-pantry-day-19 |
| /events-1/my-family-pantry-day-20 | /events/my-family-pantry-day-20 |
| /events-1/my-family-pantry-day-29,-30,-&-31 | /events/my-family-pantry-day-29-30-and-31 |
| /events-1/my-family-pantry-day-3-at-my-deah's | /events/my-family-pantry-day-3-at-my-deahs |
| /events-1/my-family-pantry-day-32 | /events/my-family-pantry-day-32 |
| /events-1/my-family-pantry-day-33 | /events/my-family-pantry-day-33 |
| /events-1/my-family-pantry-day-34 | /events/my-family-pantry-day-34 |
| /events-1/my-family-pantry-day-35 | /events/my-family-pantry-day-35 |
| /events-1/my-family-pantry-day-4 | /events/my-family-pantry-day-4 |
| /events-1/my-family-pantry-day-43 | /events/my-family-pantry-day-43 |
| /events-1/my-family-pantry-day-44 | /events/my-family-pantry-day-44 |
| /events-1/my-family-pantry-day-45 | /events/my-family-pantry-day-45 |
| /events-1/my-family-pantry-day-5- | /events/my-family-pantry-day-5 |
| /events-1/my-family-pantry-day-6- | /events/my-family-pantry-day-6 |
| /events-1/my-family-pantry-day-7 | /events/my-family-pantry-day-7 |
| /events-1/my-family-pantry-day-8- | /events/my-family-pantry-day-8 |
| /events-1/my-family-pantry-days-25-&amp;-26 | /events/my-family-pantry-days-25-and-26 |
| /events-1/my-family-pantry-days-27-&-28 | /events/my-family-pantry-days-27-and-28 |
| /events-1/my-family-pantry-days-36-40 | /events/my-family-pantry-days-36-40 |
| /events-1/my-family-pantry-days-41-&-42 | /events/my-family-pantry-days-41-and-42 |
| /events-1/my-hilltop-project-day-4 | /events/my-hilltop-project-day-4 |
| /events-1/my-hilltop-project-day-5 | /events/my-hilltop-project-day-5 |
| /events-1/my-iftaar-kitchen-2015 | /events/my-iftaar-kitchen-2015 |
| /events-1/my-iftaar-kitchen-2016:-feeding-homeless-&-needy-in-ramadan---a-youth-initiative | /events/my-iftaar-kitchen-2016-feeding-homeless-and-needy-in-ramadan-a-youth-initiative |
| /events-1/my-iftaar-kitchen-2016:-feeding-the-homeless-and-the-needy-during-ramadan | /events/my-iftaar-kitchen-2016-feeding-the-homeless-and-the-needy-during-ramadan |
| /events-1/my-iftaar-kitchen-2017-day-1 | /events/my-iftaar-kitchen-2017-day-1 |
| /events-1/my-iftaar-kitchen-2017-day-2 | /events/my-iftaar-kitchen-2017-day-2 |
| /events-1/my-iftaar-kitchen-2017-day-3,4,5 | /events/my-iftaar-kitchen-2017-day-3-4-5 |
| /events-1/my-iftaar-kitchen-2017-day-6,-7-&-8 | /events/my-iftaar-kitchen-2017-day-6-7-and-8 |
| /events-1/my-iftaar-kitchen-2017:-feeding-homeless-&-needy-in-ramadan | /events/my-iftaar-kitchen-2017-feeding-homeless-and-needy-in-ramadan |
| /events-1/my-leaders-youth-camp-(age-13---17)- | /events/my-leaders-youth-camp-age-13-17 |
| /events-1/my-project-usa's-booth-at-the-isna-convention-2017 | /events/my-project-usas-booth-at-the-isna-convention-2017 |
| /events-1/my-project-usa-@-isna-convention-2015- | /events/my-project-usa-isna-convention-2015 |
| /events-1/my-project-usa-@-the-independence-day-festival | /events/my-project-usa-the-independence-day-festival |
| /events-1/my-project-usa-annual-banquet-&-awards-2020 | /events/my-project-usa-annual-banquet-and-awards-2020 |
| /events-1/my-project-usa-annual-dinner-&amp;-awards-2019 | /events/my-project-usa-annual-dinner-and-awards-2019 |
| /events-1/my-project-usa-annual-dinner-2017 | /events/my-project-usa-annual-dinner-2017 |
| /events-1/my-project-usa-volunteers-open-house---fall-season | /events/my-project-usa-volunteers-open-house-fall-season |
| /events-1/my-project-usa:-'16--'17-planning-meeting | /events/my-project-usa-16-17-planning-meeting |
| /events-1/my-social-media-contest | /events/my-social-media-contest |
| /events-1/my-soup-kitchen---bi-weekly | /events/my-soup-kitchen-bi-weekly |
| /events-1/my-thanksgiving-food-basket-drive | /events/my-thanksgiving-food-basket-drive |
| /events-1/my-wedgewood-project-day-1 | /events/my-wedgewood-project-day-1 |
| /events-1/my-wedgewood-project-day-2 | /events/my-wedgewood-project-day-2 |
| /events-1/my-wedgewood-project-day-3- | /events/my-wedgewood-project-day-3 |
| /events-1/my-winter-clothes-drive | /events/my-winter-clothes-drive |
| /events-1/not-just-a-month | /events/not-just-a-month |
| /events-1/old-north-dayton-multicultural-spring-fling | /events/old-north-dayton-multicultural-spring-fling |
| /events-1/parent-empowerment-series-episode-1 | /events/parent-empowerment-series-episode-1 |
| /events-1/protecting-and-empowering-our-youth | /events/protecting-and-empowering-our-youth |
| /events-1/ramadan/eid-food-basket--drive- | /events/ramadan-eid-food-basket-drive |
| /events-1/roundtable-at-isna:-drugs,-gangs,-and-human-trafficking | /events/roundtable-at-isna-drugs-gangs-and-human-trafficking |
| /events-1/school-supplies-openhouse- | /events/school-supplies-openhouse |
| /events-1/service-providers-luncheon-by-ncrc | /events/service-providers-luncheon-by-ncrc |
| /events-1/sharing-eid-blessings-at-my-deah's | /events/sharing-eid-blessings-at-my-deahs |
| /events-1/soar-like-eagles---my-project-usa-annual-banquet-&-awards-2021 | /events/soar-like-eagles-my-project-usa-annual-banquet-and-awards-2021 |
| /events-1/thanks-is-giving---my-family-pantry-kickoff | /events/thanks-is-giving-my-family-pantry-kickoff |
| /events-1/the-art-of-empowering-muslim-teens | /events/the-art-of-empowering-muslim-teens |
| /events-1/the-big-table---hilltop-youth:-opportunities-and-challenges--4-pm-session | /events/the-big-table-hilltop-youth-opportunities-and-challenges-4-pm-session |
| /events-1/the-big-table---hilltop-youth:-opportunities-and-challenges--noon-session | /events/the-big-table-hilltop-youth-opportunities-and-challenges-noon-session |
| /events-1/the-columbus-expanded-sanctuary-meeting | /events/the-columbus-expanded-sanctuary-meeting |
| /events-1/the-columbus-unity-meeting:-immigrants-in-trumpland | /events/the-columbus-unity-meeting-immigrants-in-trumpland |
| /events-1/the-concert-&-spoken-word-"the-narratives-of-resilience" | /events/the-concert-and-spoken-word-the-narratives-of-resilience |
| /events-1/the-first-muslim-american-parents-summit | /events/the-first-muslim-american-parents-summit |
| /events-1/the-first-muslim-american-youth-summit | /events/the-first-muslim-american-youth-summit |
| /events-1/the-village---ramadan-interfaith-gathering-2021 | /events/the-village-ramadan-interfaith-gathering-2021 |
| /events-1/volunteer-appreciation-night | /events/volunteer-appreciation-night |
| /events-1/wedgewood-middle-school-registration-day | /events/wedgewood-middle-school-registration-day |
| /events-1/wedgewood-parents&#39;-dinner- | /events/wedgewood-parents-dinner |
| /events-1/wedgewood-readers-warriors- | /events/wedgewood-readers-warriors |
| /events-1/wedgewood-spring-celebrations | /events/wedgewood-spring-celebrations |
| /events-1/wedgewood-spruce-up-day-1 | /events/wedgewood-spruce-up-day-1 |
| /events-1/wedgewood-spruce-up-day-2- | /events/wedgewood-spruce-up-day-2 |
| /events-1/wedgewood-youth-programs- | /events/wedgewood-youth-programs |
| /events-1/workshop:-speak-to-others-about-human-trafficking- | /events/workshop-speak-to-others-about-human-trafficking |
| /events-1/youth-conference-planning-committee-meeting | /events/youth-conference-planning-committee-meeting |
| /events-1/youth-for-change-summit | /events/youth-for-change-summit |
| /events-3 | /events |
| /events-3/"the-narratives-of-resilience" | /events/the-narratives-of-resilience |
| /events-3/#myprojectisusa 2016---my-first-community-leadership-conference | /events/myprojectisusa-2016-my-first-community-leadership-conference |
| /events-3/&quot;thanks-is-giving&quot;-kick-off-event | /events/thanks-is-giving-kick-off-event |
| /events-3/-columbus-interfaith-ramadan-iftar | /events/columbus-interfaith-ramadan-iftar |
| /events-3/2017-eid-open-house-for-refugees-families | /events/2017-eid-open-house-for-refugees-families |
| /events-3/2nd-annual-youth-conference:-uplifting-our-neighborhoods---organizing-our-communities | /events/2nd-annual-youth-conference-uplifting-our-neighborhoods-organizing-our-communiti |
| /events-3/2nd-columbus-unity-meeting---immigrants-in-trumpland | /events/2nd-columbus-unity-meeting-immigrants-in-trumpland |
| /events-3/7-secrets-of-the-world's-most-successful-professional-muslims | /events/7-secrets-of-the-worlds-most-successful-professional-muslims |
| /events-3/7th-annual-neighborhood-best-practices-conference | /events/7th-annual-neighborhood-best-practices-conference |
| /events-3/a-benefit-dinner-to-protect-&-empower-columbus-youth-&-parents- | /events/a-benefit-dinner-to-protect-and-empower-columbus-youth-and-parents |
| /events-3/bake-sale-at-my-family-pantry | /events/bake-sale-at-my-family-pantry |
| /events-3/clothes-swap-for-eid-toys | /events/clothes-swap-for-eid-toys |
| /events-3/columbus-city-council-passes-a-resolution-against-islamophobia | /events/columbus-city-council-passes-a-resolution-against-islamophobia |
| /events-3/columbus-dads-meeting-for-wedgewood-kids | /events/columbus-dads-meeting-for-wedgewood-kids |
| /events-3/columbus-earth-action-day-two | /events/columbus-earth-action-day-two |
| /events-3/columbus-fasting-5k-2018-to-support-wedgewood-youth-&-families | /events/columbus-fasting-5k-2018-to-support-wedgewood-youth-and-families |
| /events-3/columbus-interfaith-ramadan-iftar-dinner-2019 | /events/columbus-interfaith-ramadan-iftar-dinner-2019 |
| /events-3/columbus-moms-meeting-for-wedgewood-kids | /events/columbus-moms-meeting-for-wedgewood-kids |
| /events-3/columbus-muslim-youth-retreat-2017 | /events/columbus-muslim-youth-retreat-2017 |
| /events-3/columbus-rally-for-expanded-sanctuary | /events/columbus-rally-for-expanded-sanctuary |
| /events-3/dare-to-care-volunteer-training | /events/dare-to-care-volunteer-training |
| /events-3/dayton-benefit-dinner-with-mayor-nan-whaley- | /events/dayton-benefit-dinner-with-mayor-nan-whaley |
| /events-3/dayton-muslim-domestic-violence-advocates-training | /events/dayton-muslim-domestic-violence-advocates-training |
| /events-3/dayton-muslim-youth-summit---discover-yourself:-create-your-footprints- | /events/dayton-muslim-youth-summit-discover-yourself-create-your-footprints |
| /events-3/dayton-muslims-mlk-event:-i-am-a-keeper | /events/dayton-muslims-mlk-event-i-am-a-keeper |
| /events-3/drugs,-gangs,-human-trafficking-&-muslim-youth---isna-roundtable | /events/drugs-gangs-human-trafficking-and-muslim-youth-isna-roundtable |
| /events-3/eakin-elementary-end-of-year-celebrations | /events/eakin-elementary-end-of-year-celebrations |
| /events-3/earth-action-days:-neighborhood-spruce-up-and-celebrations | /events/earth-action-days-neighborhood-spruce-up-and-celebrations |
| /events-3/eid-al-adha-food-basket-drive-2016 | /events/eid-al-adha-food-basket-drive-2016 |
| /events-3/eid-al-adha-mubarak | /events/eid-al-adha-mubarak |
| /events-3/eid-open-house-2017 | /events/eid-open-house-2017 |
| /events-3/emergency-rally-in-columbus,-oh | /events/emergency-rally-in-columbus-oh |
| /events-3/engaging-in-a-healthy-parent/teacher-relationship | /events/engaging-in-a-healthy-parent-teacher-relationship |
| /events-3/feed-the-needy-on-the-day-of-arafat | /events/feed-the-needy-on-the-day-of-arafat |
| /events-3/feed-the-needy-on-the-day-of-arafat-2016 | /events/feed-the-needy-on-the-day-of-arafat-2016 |
| /events-3/feeding-the-needy-on-the-day-of-arafat-2016 | /events/feeding-the-needy-on-the-day-of-arafat-2016 |
| /events-3/free-esl-classes-in-dayton | /events/free-esl-classes-in-dayton |
| /events-3/from-dr.-king-to-our-three-winners-to--our-future | /events/from-dr-king-to-our-three-winners-to-our-future |
| /events-3/healthy-and-moving,-2020 | /events/healthy-and-moving-2020 |
| /events-3/hilltop-spruce-up-&-celebrations | /events/hilltop-spruce-up-and-celebrations |
| /events-3/hilltop-youth-soccer-summer-league-awards-nights! | /events/hilltop-youth-soccer-summer-league-awards-nights |
| /events-3/homosexuality-and-muslim-americans | /events/homosexuality-and-muslim-americans |
| /events-3/honoring-&-celebrating-mayor-nan-whaley---annual-dinner-2019 | /events/honoring-and-celebrating-mayor-nan-whaley-annual-dinner-2019 |
| /events-3/iftaar-dinner-17-to-support-orphans,-refugees-&-needy-in-columbus | /events/iftaar-dinner-17-to-support-orphans-refugees-and-needy-in-columbus |
| /events-3/iftaar-dinner-to-support-orphans,-refugees-&-needy-in-columbus | /events/iftaar-dinner-to-support-orphans-refugees-and-needy-in-columbus |
| /events-3/iftaar-fundraiser:-"furthering-their-legacies"-with-farris-barakat | /events/iftaar-fundraiser-furthering-their-legacies-with-farris-barakat |
| /events-3/iftaar-kitchen-2017-week-2 | /events/iftaar-kitchen-2017-week-2 |
| /events-3/iftaar-kitchen-2017-week-2-day-1 | /events/iftaar-kitchen-2017-week-2-day-1 |
| /events-3/iftaar-kitchen-2017-week-3- | /events/iftaar-kitchen-2017-week-3 |
| /events-3/iftaar-kitchen-2017-week-4 | /events/iftaar-kitchen-2017-week-4 |
| /events-3/interfaith-celebration-of-mothers | /events/interfaith-celebration-of-mothers |
| /events-3/interfaith-vigil-for-new-zealand-victims-and-rally-against-hate | /events/interfaith-vigil-for-new-zealand-victims-and-rally-against-hate |
| /events-3/interfaith-vigil-for-victims-of-islamophobia | /events/interfaith-vigil-for-victims-of-islamophobia |
| /events-3/internet-safety-for-the-family | /events/internet-safety-for-the-family |
| /events-3/mandated-reporter-training | /events/mandated-reporter-training |
| /events-3/mlk-march | /events/mlk-march |
| /events-3/muslim-leaders-dinner-by-ncrc | /events/muslim-leaders-dinner-by-ncrc |
| /events-3/muslim-youth-townhall | /events/muslim-youth-townhall |
| /events-3/my-deah's-goodwill-store---volunteers-needed | /events/my-deahs-goodwill-store-volunteers-needed |
| /events-3/my-deah's-goodwill-store-reorganization | /events/my-deahs-goodwill-store-reorganization |
| /events-3/my-deah's-reorganizing-day | /events/my-deahs-reorganizing-day |
| /events-3/my-deah's-warehouse---sorting-week-kick-off | /events/my-deahs-warehouse-sorting-week-kick-off |
| /events-3/my-earth-action-day-3 | /events/my-earth-action-day-3 |
| /events-3/my-earth-action-day-4 | /events/my-earth-action-day-4 |
| /events-3/my-earth-action-day-5 | /events/my-earth-action-day-5 |
| /events-3/my-earth-action-day-6 | /events/my-earth-action-day-6 |
| /events-3/my-eid-drive-2016 | /events/my-eid-drive-2016 |
| /events-3/my-eid-goodwill-bazaar | /events/my-eid-goodwill-bazaar |
| /events-3/my-eid-toys-drive-2015 | /events/my-eid-toys-drive-2015 |
| /events-3/my-eid-toys-drive-2016 | /events/my-eid-toys-drive-2016 |
| /events-3/my-eid-toys-drive-2017---a-happy-eid-for-every-kid | /events/my-eid-toys-drive-2017-a-happy-eid-for-every-kid |
| /events-3/my-eid-toys-drive-2018 | /events/my-eid-toys-drive-2018 |
| /events-3/my-family-pantry | /events/my-family-pantry |
| /events-3/my-family-pantry's-first-anniversary-celebration- | /events/my-family-pantrys-first-anniversary-celebration |
| /events-3/my-family-pantry-day-#22 | /events/my-family-pantry-day-22 |
| /events-3/my-family-pantry-day-#23 | /events/my-family-pantry-day-23 |
| /events-3/my-family-pantry-day-#24 | /events/my-family-pantry-day-24 |
| /events-3/my-family-pantry-day-19 | /events/my-family-pantry-day-19 |
| /events-3/my-family-pantry-day-20 | /events/my-family-pantry-day-20 |
| /events-3/my-family-pantry-day-29,-30,-&-31 | /events/my-family-pantry-day-29-30-and-31 |
| /events-3/my-family-pantry-day-3-at-my-deah's | /events/my-family-pantry-day-3-at-my-deahs |
| /events-3/my-family-pantry-day-32 | /events/my-family-pantry-day-32 |
| /events-3/my-family-pantry-day-33 | /events/my-family-pantry-day-33 |
| /events-3/my-family-pantry-day-34 | /events/my-family-pantry-day-34 |
| /events-3/my-family-pantry-day-35 | /events/my-family-pantry-day-35 |
| /events-3/my-family-pantry-day-4 | /events/my-family-pantry-day-4 |
| /events-3/my-family-pantry-day-43 | /events/my-family-pantry-day-43 |
| /events-3/my-family-pantry-day-44 | /events/my-family-pantry-day-44 |
| /events-3/my-family-pantry-day-45 | /events/my-family-pantry-day-45 |
| /events-3/my-family-pantry-day-5- | /events/my-family-pantry-day-5 |
| /events-3/my-family-pantry-day-6- | /events/my-family-pantry-day-6 |
| /events-3/my-family-pantry-day-7 | /events/my-family-pantry-day-7 |
| /events-3/my-family-pantry-day-8- | /events/my-family-pantry-day-8 |
| /events-3/my-family-pantry-days-25-&amp;-26 | /events/my-family-pantry-days-25-and-26 |
| /events-3/my-family-pantry-days-27-&-28 | /events/my-family-pantry-days-27-and-28 |
| /events-3/my-family-pantry-days-36-40 | /events/my-family-pantry-days-36-40 |
| /events-3/my-family-pantry-days-41-&-42 | /events/my-family-pantry-days-41-and-42 |
| /events-3/my-hilltop-project-day-4 | /events/my-hilltop-project-day-4 |
| /events-3/my-hilltop-project-day-5 | /events/my-hilltop-project-day-5 |
| /events-3/my-iftaar-kitchen-2015 | /events/my-iftaar-kitchen-2015 |
| /events-3/my-iftaar-kitchen-2016:-feeding-homeless-&-needy-in-ramadan---a-youth-initiative | /events/my-iftaar-kitchen-2016-feeding-homeless-and-needy-in-ramadan-a-youth-initiative |
| /events-3/my-iftaar-kitchen-2016:-feeding-the-homeless-and-the-needy-during-ramadan | /events/my-iftaar-kitchen-2016-feeding-the-homeless-and-the-needy-during-ramadan |
| /events-3/my-iftaar-kitchen-2017-day-1 | /events/my-iftaar-kitchen-2017-day-1 |
| /events-3/my-iftaar-kitchen-2017-day-2 | /events/my-iftaar-kitchen-2017-day-2 |
| /events-3/my-iftaar-kitchen-2017-day-3,4,5 | /events/my-iftaar-kitchen-2017-day-3-4-5 |
| /events-3/my-iftaar-kitchen-2017-day-6,-7-&-8 | /events/my-iftaar-kitchen-2017-day-6-7-and-8 |
| /events-3/my-iftaar-kitchen-2017:-feeding-homeless-&-needy-in-ramadan | /events/my-iftaar-kitchen-2017-feeding-homeless-and-needy-in-ramadan |
| /events-3/my-leaders-youth-camp-(age-13---17)- | /events/my-leaders-youth-camp-age-13-17 |
| /events-3/my-project-usa's-booth-at-the-isna-convention-2017 | /events/my-project-usas-booth-at-the-isna-convention-2017 |
| /events-3/my-project-usa-@-isna-convention-2015- | /events/my-project-usa-isna-convention-2015 |
| /events-3/my-project-usa-@-the-independence-day-festival | /events/my-project-usa-the-independence-day-festival |
| /events-3/my-project-usa-annual-banquet-&-awards-2020 | /events/my-project-usa-annual-banquet-and-awards-2020 |
| /events-3/my-project-usa-annual-dinner-&amp;-awards-2019 | /events/my-project-usa-annual-dinner-and-awards-2019 |
| /events-3/my-project-usa-annual-dinner-2017 | /events/my-project-usa-annual-dinner-2017 |
| /events-3/my-project-usa-volunteers-open-house---fall-season | /events/my-project-usa-volunteers-open-house-fall-season |
| /events-3/my-project-usa:-'16--'17-planning-meeting | /events/my-project-usa-16-17-planning-meeting |
| /events-3/my-social-media-contest | /events/my-social-media-contest |
| /events-3/my-soup-kitchen---bi-weekly | /events/my-soup-kitchen-bi-weekly |
| /events-3/my-thanksgiving-food-basket-drive | /events/my-thanksgiving-food-basket-drive |
| /events-3/my-wedgewood-project-day-1 | /events/my-wedgewood-project-day-1 |
| /events-3/my-wedgewood-project-day-2 | /events/my-wedgewood-project-day-2 |
| /events-3/my-wedgewood-project-day-3- | /events/my-wedgewood-project-day-3 |
| /events-3/my-winter-clothes-drive | /events/my-winter-clothes-drive |
| /events-3/not-just-a-month | /events/not-just-a-month |
| /events-3/old-north-dayton-multicultural-spring-fling | /events/old-north-dayton-multicultural-spring-fling |
| /events-3/parent-empowerment-series-episode-1 | /events/parent-empowerment-series-episode-1 |
| /events-3/protecting-and-empowering-our-youth | /events/protecting-and-empowering-our-youth |
| /events-3/ramadan/eid-food-basket--drive- | /events/ramadan-eid-food-basket-drive |
| /events-3/roundtable-at-isna:-drugs,-gangs,-and-human-trafficking | /events/roundtable-at-isna-drugs-gangs-and-human-trafficking |
| /events-3/school-supplies-openhouse- | /events/school-supplies-openhouse |
| /events-3/service-providers-luncheon-by-ncrc | /events/service-providers-luncheon-by-ncrc |
| /events-3/sharing-eid-blessings-at-my-deah's | /events/sharing-eid-blessings-at-my-deahs |
| /events-3/soar-like-eagles---my-project-usa-annual-banquet-&-awards-2021 | /events/soar-like-eagles-my-project-usa-annual-banquet-and-awards-2021 |
| /events-3/thanks-is-giving---my-family-pantry-kickoff | /events/thanks-is-giving-my-family-pantry-kickoff |
| /events-3/the-art-of-empowering-muslim-teens | /events/the-art-of-empowering-muslim-teens |
| /events-3/the-big-table---hilltop-youth:-opportunities-and-challenges--4-pm-session | /events/the-big-table-hilltop-youth-opportunities-and-challenges-4-pm-session |
| /events-3/the-big-table---hilltop-youth:-opportunities-and-challenges--noon-session | /events/the-big-table-hilltop-youth-opportunities-and-challenges-noon-session |
| /events-3/the-columbus-expanded-sanctuary-meeting | /events/the-columbus-expanded-sanctuary-meeting |
| /events-3/the-columbus-unity-meeting:-immigrants-in-trumpland | /events/the-columbus-unity-meeting-immigrants-in-trumpland |
| /events-3/the-concert-&-spoken-word-"the-narratives-of-resilience" | /events/the-concert-and-spoken-word-the-narratives-of-resilience |
| /events-3/the-first-muslim-american-parents-summit | /events/the-first-muslim-american-parents-summit |
| /events-3/the-first-muslim-american-youth-summit | /events/the-first-muslim-american-youth-summit |
| /events-3/the-village---ramadan-interfaith-gathering-2021 | /events/the-village-ramadan-interfaith-gathering-2021 |
| /events-3/volunteer-appreciation-night | /events/volunteer-appreciation-night |
| /events-3/wedgewood-middle-school-registration-day | /events/wedgewood-middle-school-registration-day |
| /events-3/wedgewood-parents&#39;-dinner- | /events/wedgewood-parents-dinner |
| /events-3/wedgewood-readers-warriors- | /events/wedgewood-readers-warriors |
| /events-3/wedgewood-spring-celebrations | /events/wedgewood-spring-celebrations |
| /events-3/wedgewood-spruce-up-day-1 | /events/wedgewood-spruce-up-day-1 |
| /events-3/wedgewood-spruce-up-day-2- | /events/wedgewood-spruce-up-day-2 |
| /events-3/wedgewood-youth-programs- | /events/wedgewood-youth-programs |
| /events-3/workshop:-speak-to-others-about-human-trafficking- | /events/workshop-speak-to-others-about-human-trafficking |
| /events-3/youth-conference-planning-committee-meeting | /events/youth-conference-planning-committee-meeting |
| /events-3/youth-for-change-summit | /events/youth-for-change-summit |
| /my-deahs-store | /cjl-dropoff-locations |
| /product-page/1 | / |
| /product-page/10 | / |
| /product-page/11 | / |
| /product-page/12 | / |
| /product-page/2 | / |
| /product-page/4 | / |
| /product-page/5 | / |
| /product-page/5-1 | / |
| /product-page/6 | / |
| /product-page/7 | / |
| /product-page/8 | / |
| /product-page/i-m-a-product | / |
| /shop | / |
| /single-post/2015/02/19/mohammad-abdullah-saleem-the-new-face-of-muslim-child-molestation | /blog/mohammad-abdullah-saleem-the-new-face-of-muslim-child-molestation |
| /single-post/2015/03/20/three-years-after-khalil-and-abdifatah | /blog/three-years-after-khalil-and-abdifatah |
| /single-post/2015/05/11/abusive-muslim-mothers-their-victims-need-our-help | /blog/abusive-muslim-mothers-their-victims-need-our-help |
| /single-post/2015/07/01/fatima-13-a-sexslave-in-2015-america | /blog/fatima-13-a-sexslave-in-2015-america |
| /single-post/2015/09/23/the-day-of-arafat-and-those-little-princesses | /blog/the-day-of-arafat-and-those-little-princesses |
| /single-post/2015/10/09/think-beyond-winter-coats-soup-bowls | /blog/think-beyond-winter-coats-soup-bowls |
