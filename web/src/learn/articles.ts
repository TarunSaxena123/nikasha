import articles from "@/generated/learn.json";

export interface Article {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  body: string;
}

export const ARTICLES = articles as Article[];
export const PROGRESS_ARTICLES = ["what-is-drawdown", "why-most-strategies-fail", "how-option-premiums-decay"];
export const articleBySlug = (slug: string) => ARTICLES.find((a) => a.slug === slug);
