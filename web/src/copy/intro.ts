// Intro page copy (feature 05 design §1.1). Scanned against banned phrases, hashed names and
// literal date ranges; dates come only from /v1/meta.
export const INTRO = {
  heroTitle: "Nikasha",
  tagline: "The touchstone for your trading strategy.",
  heroSentence: "Test a Nifty 50 options strategy on past market data and see why it worked or failed, not just whether it did.",
  whatTitle: "What Nikasha is",
  steps: [
    { title: "Describe", text: "your strategy: pick a template, build it step by step, or upload your notes." },
    { title: "We ask", text: "about anything unclear; nothing is guessed." },
    { title: "We test it", text: "on Nifty 50 and [[india-vix|India VIX]] data {range}, with modelled option prices." },
    { title: "We explain", text: "the results: risk first, then when and why it worked or didn't." },
  ],
  helpsTitle: "How it helps",
  helps: [
    { title: "Never guesses.", text: "Vague rules like \"exit decisively\" become a question, not an assumption." },
    { title: "Explains why.", text: "Results by year, volatility level, trending vs sideways days, weekday and expiry day." },
    { title: "Risk first.", text: "Largest fall and losing streaks come before profit." },
    { title: "Checks for overfitting.", text: "Results on recent years the rules weren't tuned on." },
    { title: "Learn as you go.", text: "Templates, a glossary and what-if sliders." },
  ],
  tipsTitle: "How to get the best from it",
  tips: [
    "Write exact numbers: \"stop-loss 30 points\", not \"tight stop\".",
    "Start with the full period, then narrow it.",
    "Read the risk section before the profit.",
    "Trust results that also hold up in the unseen recent period.",
    "Few trades means little evidence.",
    "Move the what-if sliders to see how fragile a rule is.",
    "Keep the tab open and download the PDF before closing.",
  ],
  guideLink: "Read the full guide: How to use Nikasha",
  notTitle: "What Nikasha is not",
  nots: [
    "Not investment advice, and no live buy or sell signals.",
    "Option prices are modelled, not real market prices.",
    "Past results, real or simulated, don't predict the future.",
  ],
  dataTitle: "Your data and our data",
  dataText: "Nikasha stores nothing you enter. Your strategy and results live only in this browser tab.",
  getStarted: "Get started",
};

export const START = {
  title: "Choose a path",
  intro: "Three ways in. All of them end at the same review screen, where you check every rule before testing.",
  cards: [
    { title: "Templates", suits: "New to options", text: "Pick a ready-made strategy, explained in plain words. Run it in one click.", href: "/templates", cta: "See templates" },
    { title: "Build a strategy", suits: "Have rules in your head", text: "Answer a few steps: basics, strike, entry, exit. Add advanced options only if you want them.", href: "/build", cta: "Start building" },
    { title: "Upload your strategy", suits: "Have rules written down", text: "Upload a PDF, Word or text file, or paste it. We'll read it and ask about anything unclear.", href: "/upload", cta: "Upload or paste" },
  ],
};
