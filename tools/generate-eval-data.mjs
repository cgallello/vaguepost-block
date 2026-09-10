import { mkdirSync, writeFileSync } from "node:fs";

const vagueAdded = [
  "Can I say something without everyone getting mad at me?",
  "Not naming names, but wow.",
  "I know things only some people know.",
  "Some of you owe me an apology.",
  "If you know, you know.",
  "I could say more, but I won't.",
  "This changes everything.",
  "People will be mad when this comes out.",
  "I was told not to talk about this.",
  "The truth always comes out.",
  "You aren't ready for what I found.",
  "No comment.",
  "The silence is telling.",
  "Interesting choice.",
  "Somebody needs to explain themselves.",
  "I have receipts, but maybe later.",
  "Keep that same energy.",
  "I should not be saying this.",
  "This is bigger than people realize.",
  "The real story is coming.",
  "Can we talk about this without me getting in trouble?",
  "I wish I could tell you what happened.",
  "Everybody is going to pretend they are surprised.",
  "One day you will understand why I said this.",
  "I am choosing silence for now.",
];

const vagueQuotes = [
  "A fictional city council memo about a disputed transit contract.",
  "A fictional university announcement about a canceled lecture.",
  "A fictional studio note about a delayed television finale.",
  "A fictional neighborhood board post about a contested election.",
  "A fictional company memo about a leadership change.",
  "A fictional museum announcement about a returned artifact.",
  "A fictional sports league notice about a disciplinary hearing.",
  "A fictional hospital bulletin about a scheduling change.",
  "A fictional festival announcement about a headliner cancellation.",
  "A fictional publisher note about a withdrawn book.",
];

const understandableAdded = [
  "The transit contract needs a public audit.",
  "The university canceled the lecture after the fire alarm failed.",
  "The television finale was delayed by the studio strike.",
  "The neighborhood election results were certified this morning.",
  "The company appointed a new chief financial officer today.",
  "The museum returned the sculpture to its documented owner.",
  "The league suspended the player for three games.",
  "The hospital moved the clinic to the second floor.",
  "The festival replaced the headliner after the cancellation.",
  "The publisher corrected the book's map in the second edition.",
  "The budget vote failed after the committee published its report.",
  "The bridge reopened after engineers completed the inspection.",
  "The recipe needs less salt and ten more minutes in the oven.",
  "The train leaves platform four at six fifteen.",
  "The court released the written decision this afternoon.",
  "The team won the final match by two goals.",
  "The school starts its new meal program on Monday.",
  "The library extended weekend hours through October.",
  "The weather service issued a flood watch for the valley.",
  "The camera battery is fully charged and ready.",
  "The committee approved the proposal with seven votes.",
  "The exhibition opens to the public next Thursday.",
  "The software update fixes the login timeout.",
  "The garden needs water before the afternoon heat.",
  "The ferry service resumes after the maintenance check.",
];

const contextualAdded = [
  "The transit contract needs a public audit because the winning bid omitted the required accessibility plan.",
  "The university canceled the lecture after the fire alarm failed, so the event will move online tomorrow.",
  "The television finale was delayed by the studio strike, and the network posted a new schedule this morning.",
  "The neighborhood election results were certified this morning after every provisional ballot was counted.",
  "The company appointed a new chief financial officer today and published the transition timeline for investors.",
  "The museum returned the sculpture to its documented owner after an independent provenance review.",
  "The league suspended the player for three games after reviewing the footage and hearing both teams.",
  "The hospital moved the clinic to the second floor while the first-floor plumbing repairs continue.",
  "The festival replaced the headliner after the cancellation and will refund the affected ticket section.",
  "The publisher corrected the book's map in the second edition after readers identified the boundary error.",
  "The budget vote failed after the committee published its report, which explains the two disputed line items.",
  "The bridge reopened after engineers completed the inspection and posted the weight limit for trucks.",
  "The recipe needs less salt and ten more minutes in the oven because the vegetables are still firm.",
  "The train leaves platform four at six fifteen, and the next service is scheduled for seven forty.",
  "The court released the written decision this afternoon, including the reasoning behind the narrow ruling.",
  "The team won the final match by two goals after changing its formation at halftime.",
  "The school starts its new meal program on Monday, with menus and allergy guidance already posted.",
  "The library extended weekend hours through October so students can use the study rooms during exams.",
  "The weather service issued a flood watch for the valley after the forecast shifted toward heavier rainfall.",
  "The camera battery is fully charged and ready, but the spare card still needs to be formatted.",
  "The committee approved the proposal with seven votes after adding the requested public reporting clause.",
  "The exhibition opens to the public next Thursday, with the curator's tour scheduled for Saturday morning.",
  "The software update fixes the login timeout and adds a recovery link for accounts using passkeys.",
  "The garden needs water before the afternoon heat because the new seedlings have shallow roots.",
  "The ferry service resumes after the maintenance check, with the first departure leaving at noon.",
];

const edgeCases = [
  ["edge-image", "This is wild.", "[image-only fictional post]"],
  ["edge-multilingual", "No sé qué decir.", "A fictional multilingual announcement with no English context."],
  ["edge-thread", "Can I say something?", "A fictional thread whose earlier post supplies the subject."],
  ["edge-promo", "Use my code if you know what I mean.", "A fictional sponsored product card with a discount link."],
  ["edge-repost", "Wow.", "[fictional repost without added context]"],
  ["edge-deleted", "I guess we know now.", "[deleted fictional quote card]"],
  ["edge-protected", "Not everyone will understand.", "[protected fictional account quote card]"],
  ["edge-malformed", "Can I say something?", "[malformed quote card missing author metadata]"],
  ["edge-sarcasm", "Great job, everyone.", "A fictional post where the surrounding thread changes the tone."],
  ["edge-concrete-image", "The bridge reopened today.", "[image-only fictional photo of a bridge]"],
];

const rows = [];
for (let index = 0; index < 250; index += 1) rows.push({ id: `vague-${String(index + 1).padStart(3, "0")}`, label: "vague", added: vagueAdded[index % vagueAdded.length], quote: vagueQuotes[Math.floor(index / vagueAdded.length) % vagueQuotes.length] });
for (let index = 0; index < 250; index += 1) rows.push({ id: `understandable-${String(index + 1).padStart(3, "0")}`, label: "understandable", added: understandableAdded[index % understandableAdded.length], quote: vagueQuotes[Math.floor(index / understandableAdded.length) % vagueQuotes.length] });
for (let index = 0; index < 250; index += 1) rows.push({ id: `contextual-${String(index + 1).padStart(3, "0")}`, label: "contextual", added: contextualAdded[index % contextualAdded.length], quote: vagueQuotes[Math.floor(index / contextualAdded.length) % vagueQuotes.length] });
for (let index = 0; index < 100; index += 1) {
  const [family, added, quote] = edgeCases[index % edgeCases.length];
  rows.push({ id: `${family}-${String(index + 1).padStart(3, "0")}`, label: "edge", added, quote });
}

mkdirSync("eval", { recursive: true });
writeFileSync("eval/dataset.json", `${JSON.stringify(rows, null, 2)}\n`);
console.log(`Wrote ${rows.length} author-labeled sanitized benchmark rows.`);
