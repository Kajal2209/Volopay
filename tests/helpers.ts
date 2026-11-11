import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { _resetStoreForTests } from "@/lib/store";

export async function freshDataDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "quotelink-test-"));
  process.env.DATA_DIR = dir;
  _resetStoreForTests();
  return dir;
}

export const sampleQuote = {
  title: "Website redesign",
  from: { name: "Studio S" },
  client: { name: "Acme Corp" },
  currency: "INR",
  items: [
    { description: "Design", quantity: 1, unitPrice: 40000 },
    { description: "Build", quantity: 5, unitPrice: 8000 },
  ],
  taxPercent: 18,
  discount: 0,
};

export function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
