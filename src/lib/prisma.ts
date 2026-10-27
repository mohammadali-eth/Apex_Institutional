import { PrismaClient } from '@prisma/client';

declare global {
  // Allow global `var` declarations for development hot-reloading singleton
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Reusable, singleton Prisma Client instance.
 * Avoids spawning multiple database connection pools across hot reloads in development.
 */
export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
