import { type DB, eq, schema } from '@app/db'
import { updateOpenRouterSpendLimit } from '@app/openrouter'

export function normalizePlanId(planId: string): 'free' | 'pro' | 'max' {
  return planId === 'free' || planId === 'pro' || planId === 'max'
    ? (planId as 'free' | 'pro' | 'max')
    : ('pro' as const)
}

export async function updateUserPlanAndSpendLimit({
  db,
  userId,
  planId,
}: {
  db: DB
  userId: string
  planId: 'free' | 'pro' | 'max'
}) {
  await db
    .update(schema.user)
    .set({
      plan: planId,
      updatedAt: new Date(),
    })
    .where(eq(schema.user.id, userId))

  await updateOpenRouterSpendLimit({
    db,
    userId,
    planId,
  })
}
