import type { Quote, Workspace } from "./types";

export const DEMO_KEY = "demo";

export function seedDemo(now = new Date()): { workspace: Workspace; quotes: Quote[] } {
  const iso = now.toISOString();
  const inDays = (d: number) => {
    const x = new Date(now);
    x.setUTCDate(x.getUTCDate() + d);
    return x.toISOString().slice(0, 10);
  };
  const workspace: Workspace = { key: DEMO_KEY, createdAt: iso };
  const quotes: Quote[] = [
    {
      id: "demoquote1",
      workspaceKey: DEMO_KEY,
      editId: "demo-edit-1",
      shareId: "demo-share-1",
      status: "sent",
      title: "Marketing website for Acme Corp",
      from: { name: "Pixel & Pine Studio", email: "hello@pixelpine.studio" },
      client: { name: "Riya Mehta", company: "Acme Corp", email: "riya@acme.example" },
      currency: "INR",
      items: [
        { description: "Discovery workshop and sitemap", quantity: 1, unitPrice: 15000 },
        { description: "UI design – 5 pages, desktop + mobile", quantity: 5, unitPrice: 8000 },
        { description: "Next.js build and CMS setup", quantity: 1, unitPrice: 45000 },
        { description: "Launch support (2 weeks)", quantity: 1, unitPrice: 10000 },
      ],
      taxPercent: 18,
      discount: 5000,
      timeline: "4 weeks from kickoff",
      terms:
        "50% upfront, 50% on launch.\nIncludes 2 rounds of revisions per page.\nHosting and domain are billed separately.",
      notes: "Happy to walk through this on a call.",
      validUntil: inDays(14),
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: "demoquote2",
      workspaceKey: DEMO_KEY,
      editId: "demo-edit-2",
      shareId: "demo-share-2",
      status: "accepted",
      acceptedBy: { name: "Arjun Rao", at: iso },
      title: "Monthly social media retainer",
      from: { name: "Pixel & Pine Studio", email: "hello@pixelpine.studio" },
      client: { name: "Arjun Rao", company: "Brew Lab Coffee" },
      currency: "INR",
      items: [
        { description: "12 Instagram posts with captions", quantity: 12, unitPrice: 1500 },
        { description: "4 short-form reels", quantity: 4, unitPrice: 4000 },
        { description: "Monthly performance report", quantity: 1, unitPrice: 3000 },
      ],
      taxPercent: 18,
      discount: 0,
      timeline: "Monthly, starting 1st of next month",
      terms: "Billed monthly in advance. Cancel with 30 days notice.",
      validUntil: inDays(30),
      createdAt: iso,
      updatedAt: iso,
    },
  ];
  return { workspace, quotes };
}
