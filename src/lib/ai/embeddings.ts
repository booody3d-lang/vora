/** Cosine similarity between two vectors */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** Simple bag-of-words embedding for demo semantic search (no API needed) */
export function demoEmbed(text: string): number[] {
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  const dims = 64;
  const vec = new Array(dims).fill(0);
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) % dims;
    }
    vec[hash] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export interface VectorDocument {
  id: string;
  text: string;
  metadata: Record<string, string | number>;
  embedding?: number[];
}

export class VectorStore {
  private docs: VectorDocument[] = [];

  add(doc: VectorDocument, embedding: number[]) {
    this.docs.push({ ...doc, embedding });
  }

  search(queryEmbedding: number[], topK = 5): { doc: VectorDocument; score: number }[] {
    return this.docs
      .map((doc) => ({
        doc,
        score: cosineSimilarity(queryEmbedding, doc.embedding ?? []),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

/** Pre-seeded VORA marketplace + jobs vector index for demo matchmaking */
export function createDemoVectorStore(): VectorStore {
  const store = new VectorStore();
  const corpus: VectorDocument[] = [
    { id: "job-1", text: "Senior Product Designer UX Figma design systems enterprise SaaS Dubai Riyadh", metadata: { type: "job", title: "Senior Product Designer", company: "TechCorp Global" } },
    { id: "job-2", text: "UX Lead fintech banking mobile app Arabic localization Saudi Arabia", metadata: { type: "job", title: "UX Lead — Fintech", company: "Gulf Ventures" } },
    { id: "job-3", text: "Frontend Developer React TypeScript Next.js web development remote", metadata: { type: "job", title: "Frontend Developer", company: "Startup Hub KSA" } },
    { id: "svc-1", text: "Professional logo design brand identity Saudi Arabia bilingual Arabic English", metadata: { type: "service", title: "Professional Logo Design", store: "Alex Design Studio", price: 299 } },
    { id: "svc-2", text: "UI UX app design mobile responsive Figma prototype delivery", metadata: { type: "service", title: "UI/UX App Design", store: "Alex Design Studio", price: 899 } },
    { id: "svc-3", text: "WordPress website setup Saudi business landing page SEO", metadata: { type: "service", title: "WordPress Website Setup", store: "Riyadh Dev Shop", price: 350 } },
    { id: "svc-4", text: "AI chatbot integration OpenAI automation business workflow", metadata: { type: "service", title: "AI Chatbot Integration", store: "AI Solutions KSA", price: 1200 } },
  ];

  for (const doc of corpus) {
    store.add(doc, demoEmbed(doc.text));
  }
  return store;
}

let demoStore: VectorStore | null = null;

export function getDemoVectorStore(): VectorStore {
  if (!demoStore) demoStore = createDemoVectorStore();
  return demoStore;
}
