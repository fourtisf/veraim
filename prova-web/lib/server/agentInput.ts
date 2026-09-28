import { z } from "zod";
import { CATEGORIES, GRADING_OPTIONS, MODEL_OPTIONS, PRICE_OPTIONS, TOOL_OPTIONS } from "@/config/models";

// Validation for the builder's "Launch agent".
export const NewAgent = z.object({
  name: z.string().trim().min(2, "Give your agent a name.").max(24),
  tagline: z.string().trim().min(8, "Add a one-line description.").max(60),
  category: z.enum(CATEGORIES as [string, ...string[]]),
  instructions: z.string().trim().min(40, "Instructions need at least 40 characters.").max(2000),
  model: z.enum(MODEL_OPTIONS.map((m) => m.key) as [string, ...string[]]),
  gradingMode: z.enum(GRADING_OPTIONS.map((g) => g.key) as [string, ...string[]]),
  tools: z.array(z.enum(TOOL_OPTIONS.map((t) => t[0]) as [string, ...string[]])).max(6),
  ticker: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,8}$/, "Ticker must be 2–8 letters or numbers."),
  price: z.number().refine((p) => PRICE_OPTIONS.includes(p), "Pick a listed price."),
  openingBuy: z.string().trim().max(40).optional().default(""),
});

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "agent";
