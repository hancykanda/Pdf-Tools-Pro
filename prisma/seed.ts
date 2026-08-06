/**
 * Prisma seed — creates/updates the built-in "Teacher Premium" plan.
 *
 * Run (requires a reachable DATABASE_URL):
 *   npx prisma db push      # create the tables
 *   npm run db:seed         # this script
 *
 * `PREMIUM_PLAN_ID`
 *   When set, `ensureDefaultPlan()` upserts the plan under THAT id instead of
 *   generating a cuid, so every environment (dev / staging / prod) shares one
 *   stable plan id that the UI can hard-link to. Leave it empty on the first
 *   run, copy the id printed below into `.env` as `PREMIUM_PLAN_ID`, and every
 *   later seed will update that exact row.
 *
 * Note: `@/*` imports inside `src/lib/*` are resolved from `tsconfig.json`
 * paths by `tsx` (the runner used in the `db:seed` script).
 */
import type { PrismaClient } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { ensureDefaultPlan, listPlans } from '../src/lib/subscription';
import { ALL_FREE_TOOL_IDS } from '../src/lib/planFeatures';

const db: PrismaClient = prisma;

async function main(): Promise<void> {
  const planId = await ensureDefaultPlan();

  // Ensure a Free plan exists with every free tool selected by default.
  const freeFeatures = JSON.stringify(ALL_FREE_TOOL_IDS);
  const freePlan = await db.plan.findFirst({ where: { name: 'Free' } });
  if (freePlan) {
    await db.plan.update({
      where: { id: freePlan.id },
      data: {
        description: 'All free PDF tools — no account required.',
        priceMonthly: 0,
        currency: 'TZS',
        features: freeFeatures,
      },
    });
  } else {
    await db.plan.create({
      data: {
        name: 'Free',
        description: 'All free PDF tools — no account required.',
        priceMonthly: 0,
        currency: 'TZS',
        features: freeFeatures,
      },
    });
  }

  const plans = await listPlans();

  console.log(`✔ Default plan ready: ${planId}`);
  console.log('  Set PREMIUM_PLAN_ID="%s" in your .env to pin it.', planId);
  console.log(`✔ Active plans (${plans.length}):`);
  for (const plan of plans) {
    console.log(`   - ${plan.name} — ${plan.currency} ${plan.priceMonthly.toFixed(2)}/mo (${plan.id})`);
  }
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error('Seed failed:', error);
    await db.$disconnect();
    process.exit(1);
  });
