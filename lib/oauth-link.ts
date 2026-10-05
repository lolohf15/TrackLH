/**
 * Decides which `User` an outside sign-in belongs to. Kept free of Auth.js so
 * the rules can be tested against a fake database.
 *
 * Order matters: the provider's own id wins over the email, so someone who
 * changes their email at Google keeps their ledger instead of getting a
 * second, empty user.
 */

export interface OAuthIdentity {
  provider: string;
  providerAccountId: string;
  email: string;
  name?: string | null;
}

/** The slice of Prisma this needs; the real client satisfies it structurally. */
export interface OAuthDb {
  oAuthAccount: {
    findUnique(args: {
      where: { provider_providerAccountId: { provider: string; providerAccountId: string } };
      select: { userId: true };
    }): Promise<{ userId: string } | null>;
    create(args: {
      data: { userId: string; provider: string; providerAccountId: string; email: string };
    }): Promise<unknown>;
  };
  user: {
    findUnique(args: { where: { email: string }; select: { id: true } }): Promise<{ id: string } | null>;
    create(args: {
      data: { email: string; name: string | null; passwordHash: null; onboardedAt: null };
      select: { id: true };
    }): Promise<{ id: string }>;
  };
}

/**
 * Callers must have refused unverified emails already: both linking to an
 * existing user and creating a new one trust `email` to belong to the person.
 */
export async function resolveOAuthUser(db: OAuthDb, identity: OAuthIdentity): Promise<string> {
  const { provider, providerAccountId } = identity;
  const email = identity.email.trim().toLowerCase();

  const known = await db.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    select: { userId: true },
  });
  if (known) return known.userId;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  // A new user has no password and has not onboarded, so they land in the
  // welcome wizard like any other fresh account.
  const userId =
    existing?.id ??
    (
      await db.user.create({
        data: {
          email,
          name: identity.name?.trim() ? identity.name.trim().slice(0, 80) : null,
          passwordHash: null,
          onboardedAt: null,
        },
        select: { id: true },
      })
    ).id;

  await db.oAuthAccount.create({ data: { userId, provider, providerAccountId, email } });
  return userId;
}
