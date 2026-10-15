import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { ARTICLES, articleBySlug } from "@/learn/articles";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = articleBySlug(slug);
  if (!a) notFound();
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/learn" className="text-sm text-info underline">← Learn</Link>
      <article className="mt-4 rounded-lg border border-line bg-surface p-6">
        <h1 className="text-2xl font-semibold">{a.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{a.minutes} min read</p>
        <div className="mt-4"><Markdown source={a.body} /></div>
      </article>
    </main>
  );
}
