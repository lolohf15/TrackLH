import { describe, expect, it } from "vitest";
import { resolveOAuthUser, type OAuthDb } from "./oauth-link";

function fakeDb(seed: { users?: { id: string; email: string }[]; links?: { userId: string; provider: string; providerAccountId: string }[] } = {}) {
  const users = [...(seed.users ?? [])];
  const links = [...(seed.links ?? [])];
  const created: unknown[] = [];
  const db: OAuthDb = {
    oAuthAccount: {
      async findUnique({ where }) {
        const k = where.provider_providerAccountId;
        const hit = links.find((l) => l.provider === k.provider && l.providerAccountId === k.providerAccountId);
        return hit ? { userId: hit.userId } : null;
      },
      async create({ data }) {
        links.push(data);
        return data;
      },
    },
    user: {
      async findUnique({ where }) {
        return users.find((u) => u.email === where.email) ?? null;
      },
      async create({ data }) {
        const u = { id: `u${users.length + 1}`, email: data.email };
        users.push(u);
        created.push(data);
        return { id: u.id };
      },
    },
  };
  return { db, users, links, created };
}

const google = { provider: "google", providerAccountId: "g-1", email: "Ana@Mail.com", name: " Ana " };

describe("resolveOAuthUser", () => {
  it("creates a passwordless, not-yet-onboarded user for a new email", async () => {
    const { db, users, links, created } = fakeDb();
    const id = await resolveOAuthUser(db, google);
    expect(users).toEqual([{ id, email: "ana@mail.com" }]);
    expect(created[0]).toMatchObject({ name: "Ana", passwordHash: null, onboardedAt: null });
    expect(links).toEqual([{ userId: id, provider: "google", providerAccountId: "g-1", email: "ana@mail.com" }]);
  });

  it("links to an existing credentials user with the same email", async () => {
    const { db, users, links } = fakeDb({ users: [{ id: "owner", email: "ana@mail.com" }] });
    expect(await resolveOAuthUser(db, google)).toBe("owner");
    expect(users).toHaveLength(1);
    expect(links[0].userId).toBe("owner");
  });

  it("keeps the same user when the email changes at the provider", async () => {
    const { db, users } = fakeDb({
      users: [{ id: "owner", email: "old@mail.com" }],
      links: [{ userId: "owner", provider: "google", providerAccountId: "g-1" }],
    });
    expect(await resolveOAuthUser(db, { ...google, email: "new@mail.com" })).toBe("owner");
    expect(users).toHaveLength(1);
  });

  it("does not mix up the same id under another provider", async () => {
    const { db } = fakeDb({ links: [{ userId: "owner", provider: "apple", providerAccountId: "g-1" }] });
    expect(await resolveOAuthUser(db, google)).not.toBe("owner");
  });
});
