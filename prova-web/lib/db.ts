import { PrismaClient } from "@prisma/client";

// One Prisma client per server process (reused across hot reloads in dev).
const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
