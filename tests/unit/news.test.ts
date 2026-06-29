import { describe, expect, it } from "vitest";
import {
  isAudienceTeam,
  isExpired,
  isValidAudience,
  isValidReaction,
  NEWS_LIMITS,
  parseBody,
  parseExpiresAt,
  parseTitle,
  relativeTime,
  summarizeBody,
  tallyReactions,
} from "@/lib/domain/news";

describe("parseTitle", () => {
  it("rechaza titulo no string", () => {
    expect(parseTitle(123).ok).toBe(false);
  });
  it("rechaza titulo vacio", () => {
    expect(parseTitle("   ").ok).toBe(false);
  });
  it("rechaza titulo demasiado largo", () => {
    const long = "a".repeat(NEWS_LIMITS.MAX_TITLE + 1);
    expect(parseTitle(long).ok).toBe(false);
  });
  it("acepta titulo valido", () => {
    const r = parseTitle("  Hola mundo  ");
    expect(r.ok).toBe(true);
    expect(r.value).toBe("Hola mundo");
  });
});

describe("parseBody", () => {
  it("rechaza body no string", () => {
    expect(parseBody(null).ok).toBe(false);
  });
  it("rechaza body vacio", () => {
    expect(parseBody("").ok).toBe(false);
  });
  it("rechaza body demasiado largo", () => {
    const long = "a".repeat(NEWS_LIMITS.MAX_BODY + 1);
    expect(parseBody(long).ok).toBe(false);
  });
  it("acepta body con markdown", () => {
    const r = parseBody("## Hola\n\nEsto es un **cuerpo**.");
    expect(r.ok).toBe(true);
    expect(r.value).toContain("**cuerpo**");
  });
});

describe("parseExpiresAt", () => {
  it("acepta null como sin caducidad", () => {
    expect(parseExpiresAt(null)).toBe(null);
    expect(parseExpiresAt("")).toBe(null);
    expect(parseExpiresAt(undefined)).toBe(null);
  });
  it("rechaza fecha invalida", () => {
    const r = parseExpiresAt("ayer");
    expect(typeof r === "object" && r !== null && "error" in r).toBe(true);
  });
  it("rechaza fecha en el pasado", () => {
    const r = parseExpiresAt("2000-01-01T00:00:00Z");
    expect(typeof r === "object" && r !== null && "error" in r).toBe(true);
  });
  it("rechaza fecha más allá de 365 días", () => {
    const future = new Date(Date.now() + 400 * 86400000).toISOString();
    const r = parseExpiresAt(future);
    expect(typeof r === "object" && r !== null && "error" in r).toBe(true);
  });
  it("acepta fecha futura razonable", () => {
    const future = new Date(Date.now() + 10 * 86400000).toISOString();
    const r = parseExpiresAt(future);
    expect(typeof r === "string").toBe(true);
  });
});

describe("isExpired", () => {
  it("false cuando expiresAt es null", () => {
    expect(isExpired(null)).toBe(false);
  });
  it("true cuando expiresAt es del pasado", () => {
    expect(isExpired("2000-01-01T00:00:00Z")).toBe(true);
  });
  it("false cuando expiresAt es del futuro", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    expect(isExpired(future)).toBe(false);
  });
});

describe("isValidReaction / isValidAudience / isAudienceTeam", () => {
  it("reactions validas", () => {
    expect(isValidReaction("like")).toBe(true);
    expect(isValidReaction("fire")).toBe(true);
    expect(isValidReaction("thanks")).toBe(true);
    expect(isValidReaction("hate")).toBe(false);
  });
  it("audiences validas", () => {
    expect(isValidAudience("club")).toBe(true);
    expect(isValidAudience("team")).toBe(true);
    expect(isValidAudience("all")).toBe(false);
  });
  it("isAudienceTeam", () => {
    expect(isAudienceTeam("team", "abc")).toBe(true);
    expect(isAudienceTeam("team", null)).toBe(false);
    expect(isAudienceTeam("club", "abc")).toBe(false);
  });
});

describe("tallyReactions", () => {
  it("cuenta por tipo y marca las del viewer", () => {
    const t = tallyReactions(
      [
        { reaction: "like", profile_id: "p1" },
        { reaction: "like", profile_id: "p2" },
        { reaction: "fire", profile_id: "p1" },
        { reaction: "thanks", profile_id: "p3" },
      ],
      "p1",
    );
    const like = t.find((x) => x.reaction === "like");
    const fire = t.find((x) => x.reaction === "fire");
    const thanks = t.find((x) => x.reaction === "thanks");
    expect(like?.count).toBe(2);
    expect(like?.hasMine).toBe(true);
    expect(fire?.count).toBe(1);
    expect(fire?.hasMine).toBe(true);
    expect(thanks?.count).toBe(1);
    expect(thanks?.hasMine).toBe(false);
  });
  it("ignora reacciones invalidas", () => {
    const t = tallyReactions(
      [
        { reaction: "love", profile_id: "p1" },
        { reaction: "like", profile_id: "p2" },
      ],
      null,
    );
    const like = t.find((x) => x.reaction === "like");
    expect(like?.count).toBe(1);
    const love = t.find((x) => x.reaction === "fire");
    expect(love?.count).toBe(0);
  });
  it("devuelve las 3 reacciones incluso si count=0", () => {
    const t = tallyReactions([], null);
    expect(t).toHaveLength(3);
  });
});

describe("summarizeBody", () => {
  it("elimina markdown y limita longitud", () => {
    const md = "## Hola\n\nEsto es **muy** importante para el [equipo](https://example.com).";
    const s = summarizeBody(md, 50);
    expect(s).not.toContain("#");
    expect(s).not.toContain("**");
    expect(s).not.toContain("[");
    expect(s.length).toBeLessThanOrEqual(50);
  });
  it("respeta el maximo de longitud", () => {
    const md = "a ".repeat(1000);
    const s = summarizeBody(md, 100);
    expect(s.length).toBeLessThanOrEqual(100);
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-01-15T12:00:00Z");
  it("ahora mismo si < 30 s", () => {
    const iso = new Date("2026-01-15T11:59:45Z").toISOString();
    expect(relativeTime(iso, now)).toBe("ahora mismo");
  });
  it("hace Xh para horas", () => {
    const iso = new Date("2026-01-15T09:00:00Z").toISOString();
    expect(relativeTime(iso, now)).toBe("hace 3 h");
  });
  it("hace Xd para dias", () => {
    const iso = new Date("2026-01-13T12:00:00Z").toISOString();
    expect(relativeTime(iso, now)).toBe("hace 2 d");
  });
});
