import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CatalogueBook {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  description: string | null;
  type: string;
  available_physical: number;
  available_digital: number;
}

interface Recommendation {
  book_id: string;
  title: string;
  author: string;
  reason: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "Please describe what you are looking for" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      // Run as the calling user so RLS (books_select_all is `to authenticated`)
      // returns rows. The frontend sends the user's access token here.
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );

    // Fetch the full catalogue so Groq can pick from real books
    const { data: books, error } = await supabase
      .from("books")
      .select("id, title, author, category, description, type, available_physical, available_digital")
      .order("title");

    if (error || !books || books.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          recommendations: [],
          message: "The catalogue is currently empty. Please check back later.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const catalogue = books as CatalogueBook[];

    const groqKey = Deno.env.get("GROQ_API_KEY");

    if (!groqKey) {
      // Keyword-based fallback when no Groq key is configured
      const fallback = keywordRecommend(query, catalogue);
      return new Response(
        JSON.stringify({
          ok: true,
          recommendations: fallback,
          source: "keyword",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build a compact catalogue listing for the LLM prompt
    const catalogueText = catalogue
      .map(
        (b, i) =>
          `${i + 1}. id=${b.id} | "${b.title}" by ${b.author ?? "Unknown"} | category: ${b.category ?? "N/A"} | ${b.description ?? "No description"}`,
      )
      .join("\n");

    const systemPrompt = `You are a knowledgeable KNUST librarian assistant. A student or staff member describes what kind of book they want to read. Recommend the 3 best matches from the catalogue below.

Rules:
- Only recommend books that exist in the catalogue (use their exact id and title).
- For each recommendation, give a short, friendly reason (1-2 sentences) explaining why it fits.
- Respond as valid JSON only — no markdown, no explanation outside the JSON.

Output format:
{"recommendations":[{"book_id":"...","title":"...","author":"...","reason":"..."}]}`;

    const userPrompt = `User request: "${query}"

Catalogue:
${catalogueText}

Recommend 3 books from this catalogue as JSON.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error:", errText);
      const fallback = keywordRecommend(query, catalogue);
      return new Response(
        JSON.stringify({
          ok: true,
          recommendations: fallback,
          source: "keyword",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const groqData = await groqRes.json();
    const rawContent = groqData?.choices?.[0]?.message?.content ?? "";

    let recs: Recommendation[] = [];
    try {
      const parsed = JSON.parse(rawContent);
      recs = (parsed.recommendations ?? []) as Recommendation[];
    } catch {
      // JSON parse failed — fall back to keyword matching
      recs = keywordRecommend(query, catalogue);
    }

    // Enrich with live availability data from the catalogue
    const enriched = recs
      .map((r) => {
        const book = catalogue.find((b) => b.id === r.book_id || b.title === r.title);
        if (!book) return null;
        return {
          book_id: book.id,
          title: book.title,
          author: book.author ?? "Unknown",
          category: book.category,
          available_physical: book.available_physical,
          available_digital: book.available_digital,
          type: book.type,
          reason: r.reason,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return new Response(
      JSON.stringify({
        ok: true,
        recommendations: enriched,
        source: "groq",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// Keyword-based fallback recommendation engine
function keywordRecommend(query: string, books: CatalogueBook[]): Recommendation[] {
  const stop = new Set([
    "the", "a", "an", "is", "are", "can", "i", "you", "to", "of", "and", "for",
    "my", "me", "do", "how", "what", "when", "with", "in", "on", "at", "if",
    "book", "books", "read", "reading", "want", "need", "looking", "find",
    "recommend", "please", "about", "like", "something", "good",
  ]);
  const qTerms = new Set(
    query.toLowerCase().match(/[a-z0-9]+/g)?.filter((w) => !stop.has(w)) ?? [],
  );

  const scored = books.map((b) => {
    const haystack = `${b.title} ${b.author ?? ""} ${b.category ?? ""} ${b.description ?? ""}`.toLowerCase();
    let hits = 0;
    for (const term of qTerms) {
      if (haystack.includes(term)) hits++;
    }
    return { book: b, score: qTerms.size > 0 ? hits / qTerms.size : 0 };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter((s) => s.score > 0)
    .map((s) => ({
      book_id: s.book.id,
      title: s.book.title,
      author: s.book.author ?? "Unknown",
      reason: `Matches your interest in "${query}" — found in the ${s.book.category ?? "library"} collection.`,
    }));
}
