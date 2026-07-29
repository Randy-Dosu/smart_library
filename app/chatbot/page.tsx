'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Send, Loader2, BookOpen, Book as BookIcon, Smartphone, ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/providers/app-shell';
import { useAuth } from '@/components/providers/auth-provider';
import { supabaseUrl } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Recommendation {
  book_id: string;
  title: string;
  author: string;
  category: string | null;
  available_physical: number;
  available_digital: number;
  type: string;
  reason: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  recommendations?: Recommendation[];
}

const suggestedPrompts = [
  'I want to learn about algorithms and data structures',
  'Something on African history and politics',
  'Books for engineering mechanics and thermodynamics',
  'I need help with organic chemistry',
  'Recommend a book on marketing and business finance',
];

export default function RecommenderPage() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hello! I'm your KNUST Library book recommender. Tell me what you're studying or what topic you're interested in, and I'll suggest the best books from our catalogue.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const ask = async (prompt: string) => {
    if (!prompt.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: prompt };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ query: prompt }),
      });

      if (!res.ok) throw new Error('Recommender request failed');
      const data = await res.json();

      if (!data.ok) throw new Error(data.error ?? 'Request failed');

      const recs: Recommendation[] = data.recommendations ?? [];
      const msg = recs.length > 0
        ? `Based on what you told me, here are ${recs.length} book${recs.length > 1 ? 's' : ''} I think you'll find useful:`
        : (data.message ?? "I couldn't find a good match in the catalogue. Try describing your topic differently.");

      setMessages((m) => [
        ...m,
        { role: 'assistant', content: msg, recommendations: recs },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'Sorry, I had trouble getting recommendations. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Book Recommender
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Describe what you want to read or study, and get instant recommendations from the KNUST catalogue.
          </p>
        </div>

        <Card className="flex flex-col h-[60vh]">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Recommender Chat
            </CardTitle>
          </CardHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] space-y-3 ${msg.role === 'user' ? '' : 'w-full'}`}>
                  <div
                    className={`rounded-lg px-4 py-2 text-sm animate-in-fade ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="leading-relaxed">{msg.content}</p>
                  </div>
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="space-y-2 pl-1">
                      {msg.recommendations.map((rec) => (
                        <RecommendationCard key={rec.book_id} rec={rec} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Finding books for you...</span>
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-muted-foreground mb-2">Try these:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((q) => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    className="text-xs rounded-full border border-border px-3 py-1.5 hover:bg-muted transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-border/60 p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe what you want to read or study..."
                disabled={loading}
              />
              <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const physAvail = rec.available_physical > 0;
  const digAvail = rec.available_digital > 0;
  const hasPhysical = rec.type !== 'digital';
  const hasDigital = rec.type !== 'physical';

  return (
    <Card className="animate-in-up border-border/60 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-9 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <Link href={`/catalogue/${rec.book_id}`}>
              <p className="font-medium text-sm hover:text-primary transition-colors">{rec.title}</p>
            </Link>
            <p className="text-xs text-muted-foreground">{rec.author}</p>
            {rec.category && (
              <Badge variant="secondary" className="mt-1 text-[10px]">{rec.category}</Badge>
            )}
            <p className="text-xs text-foreground mt-2 leading-relaxed italic">
              {rec.reason}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {hasPhysical && (
                <Badge className={`text-[10px] gap-1 ${physAvail ? 'bg-primary/90 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <BookIcon className="h-2.5 w-2.5" />
                  {physAvail ? `${rec.available_physical} physical` : 'No physical'}
                </Badge>
              )}
              {hasDigital && (
                <Badge className={`text-[10px] gap-1 ${digAvail ? 'bg-secondary/90 text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <Smartphone className="h-2.5 w-2.5" />
                  {digAvail ? `${rec.available_digital} digital` : 'No digital'}
                </Badge>
              )}
              <Link href={`/catalogue/${rec.book_id}`}>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1 ml-auto">
                  View
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
