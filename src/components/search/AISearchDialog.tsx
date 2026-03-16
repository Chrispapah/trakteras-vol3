import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Search, Loader2, Sparkles, ExternalLink, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

const SEARCH_FUNCTION_URL = 'https://izxbjndafoqrkjwvutax.supabase.co/functions/v1/search';
const SUPABASE_PUBLISHABLE_KEY =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_PUBLISHABLE_KEY;

interface SearchFunctionResponse {
  query?: string;
  synthesized_answer?: string;
  domains_queried?: number;
  all_sources_found?: string[];
  error?: string;
}

interface AISearchDialogProps {
  trigger?: React.ReactNode;
}

const formatAiSummary = (summary: string) =>
  summary
    .replace(/\[Source Group[^\]]*\]/gi, '')
    .replace(/\[Search Result[^\]]*\]/gi, '')
    .replace(/\*{3,}/g, '')
    .replace(/(?:^|\n)###?\s*Top\s+\d+\s+Sources[\s\S]*$/i, '')
    .replace(/(?:^|\n)Top\s+\d+\s+Sources[\s\S]*$/i, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export function AISearchDialog({ trigger }: AISearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [citations, setCitations] = useState<string[]>([]);
  const [domainsQueried, setDomainsQueried] = useState<number | null>(null);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setAiSummary('');
    setCitations([]);
    setDomainsQueried(null);
    setSearchError('');
    setHasSearched(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      const response = await fetch(SEARCH_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(SUPABASE_PUBLISHABLE_KEY ? { apikey: SUPABASE_PUBLISHABLE_KEY } : {}),
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          query: query.trim(),
        }),
      });

      const data = await response.json().catch(() => null) as SearchFunctionResponse | null;

      if (!response.ok) {
        throw new Error(data?.error || `Search request failed with status ${response.status}`);
      }

      if (data?.synthesized_answer) setAiSummary(formatAiSummary(data.synthesized_answer));
      if (typeof data?.domains_queried === 'number') setDomainsQueried(data.domains_queried);
      if (Array.isArray(data?.all_sources_found)) setCitations(data.all_sources_found);
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Η AI αναζήτηση δεν ήταν διαθέσιμη. Δοκίμασε ξανά σε λίγο.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setHasSearched(false); setAiSummary(''); setCitations([]); setDomainsQueried(null); setSearchError(''); setQuery(''); } }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="w-4 h-4" />
            AI Αναζήτηση
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex h-[95dvh] w-[calc(100vw-0.75rem)] max-w-[88rem] flex-col gap-0 overflow-hidden rounded-xl border-border bg-background p-0 sm:h-[94dvh] sm:w-[98vw]">
        {/* Header */}
        <DialogHeader className="shrink-0 space-y-3 px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-3">
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            AI Αναζήτηση
          </DialogTitle>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Αναζήτηση... (π.χ. λίπασμα, πότισμα, σπορά)"
              className="pl-10 pr-12 h-11 bg-card border-border"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </DialogHeader>

        {/* Results Area */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="min-w-0 px-3 pb-4 sm:px-4 sm:pb-5 space-y-4">
            {/* Loading State */}
            {isSearching && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Αναζήτηση με AI...</p>
              </div>
            )}

            {/* Error State */}
            {searchError && !isSearching && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive">{searchError}</p>
              </div>
            )}

            {/* Empty State */}
            {!hasSearched && !isSearching && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Αναζήτησε ό,τι χρειάζεσαι</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Πληροφορίες γεωργίας από το AI search
                  </p>
                </div>
              </div>
            )}

            {/* AI Summary */}
            {aiSummary && !isSearching && (
              <div className="min-w-0 overflow-hidden rounded-xl bg-primary/5 border border-primary/15 p-3 sm:p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">AI Περίληψη</span>
                </div>
                {domainsQueried !== null && (
                  <p className="text-xs text-muted-foreground">
                    Αναζήτηση σε {domainsQueried} domains
                  </p>
                )}
                <div className="min-w-0 max-w-full overflow-hidden text-xs sm:text-sm leading-5 sm:leading-6 text-foreground space-y-2 break-words [overflow-wrap:anywhere] [&_*]:max-w-full [&_*]:break-words [&_p]:mb-2 last:[&_p]:mb-0 [&_p]:break-words [&_strong]:text-primary [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:space-y-1 [&_li]:text-xs sm:[&_li]:text-sm [&_li]:break-words [&_h1]:text-sm sm:[&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-1 [&_h2]:text-sm sm:[&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-1 [&_h3]:text-xs sm:[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_a]:break-all [&_a]:text-primary">
                  <ReactMarkdown>{
                    aiSummary
                      .replace(/\[(\d+)\]/g, '**[$1]**')
                      .replace(/\n{3,}/g, '\n\n')
                  }</ReactMarkdown>
                </div>
                {citations.length > 0 && (
                  <div className="pt-2 border-t border-primary/10 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Πηγές</p>
                    <div className="flex flex-wrap gap-1.5">
                      {citations.slice(0, 6).map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary truncate max-w-[200px]"
                        >
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          {getDomainFromUrl(url)}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No Results */}
            {hasSearched && !isSearching && !aiSummary && !searchError && (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <p className="text-sm text-muted-foreground">Δεν βρέθηκαν αποτελέσματα</p>
                <p className="text-xs text-muted-foreground">Δοκίμασε διαφορετικούς όρους αναζήτησης</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
