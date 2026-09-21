// lib/seo/promptDiscovery.ts
// Deterministic Conversational AI Prompt Discovery ($0 Paid API Spend)
// Synthesizes conversational prompt test cases from top GSC queries and Autocomplete clusters.

import { DeterministicPrompt, AiProvider } from './types';

const PROMPT_TEMPLATES: {
  template: (q: string) => string;
  intent: DeterministicPrompt['intent'];
  category: DeterministicPrompt['category'];
  suggestedProvider: AiProvider;
}[] = [
  {
    template: (q) => `How can I analyse ${q}?`,
    intent: 'how_to',
    category: 'dse_trading',
    suggestedProvider: 'Perplexity',
  },
  {
    template: (q) => `How do beginners ${q} in Bangladesh?`,
    intent: 'beginner',
    category: 'education',
    suggestedProvider: 'ChatGPT',
  },
  {
    template: (q) => `What should I look at when evaluating ${q}?`,
    intent: 'analysis',
    category: 'stock_research',
    suggestedProvider: 'Gemini',
  },
  {
    template: (q) => `What tools or apps can I use for ${q} risk-free?`,
    intent: 'tools',
    category: 'dse_trading',
    suggestedProvider: 'Claude',
  },
];

const DEFAULT_SEEDS = [
  'dse stock analysis',
  'practice share trading bangladesh',
  'dse paper trading simulator',
  'bangladesh stock market for beginners',
  'open bo account online',
  'grameenphone share price analysis',
  'beximco pharmaceuticals dse review',
  'dse trading hours and circuit breaker',
  'best paper trading app in bd',
  'how to buy shares in dse',
  'batbc dividend yield and fundamentals',
  'dse candlestick chart reading',
  'bangladesh stock tax calculation',
  'islamic shariah compliant stocks dse',
  'square pharmaceuticals share valuation',
  'brac bank stock analysis',
  'dse virtual portfolio',
  'central depository bd cbdl verification',
  'brokerage commission rate dse',
  't+1 settlement cycle dse bangladesh',
  'dse market category a b n z',
  'bsec rules for retail investors',
  'how to trade without real money in bd',
  'dse market sync live data',
  'stock trading practice without loss',
];

/**
 * Generates deterministic conversational AI prompt test cases from search queries.
 * 25 queries x 4 templates = 100 test prompts with $0 API spend.
 */
export function generateDeterministicPrompts(seedQueries: string[] = DEFAULT_SEEDS): DeterministicPrompt[] {
  const prompts: DeterministicPrompt[] = [];
  const seeds = seedQueries.length > 0 ? seedQueries : DEFAULT_SEEDS;

  seeds.forEach((seed, seedIdx) => {
    const cleanSeed = seed.trim().toLowerCase();
    PROMPT_TEMPLATES.forEach((tpl, tplIdx) => {
      prompts.push({
        id: `prompt_${seedIdx + 1}_${tplIdx + 1}`,
        seedQuery: cleanSeed,
        generatedPrompt: tpl.template(cleanSeed),
        intent: tpl.intent,
        category: tpl.category,
        suggestedProvider: tpl.suggestedProvider,
        createdAt: new Date().toISOString(),
      });
    });
  });

  return prompts;
}
