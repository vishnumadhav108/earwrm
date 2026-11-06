import { describe, expect, it } from "vitest";
import { firstSentence, releaseType } from "@/lib/musicbrainz";

describe("releaseType", () => {
  it("maps primary types", () => {
    expect(releaseType("Album", [])).toBe("Album");
    expect(releaseType("single", null)).toBe("Single");
    expect(releaseType("EP", undefined)).toBe("EP");
  });

  it("drops releases with an excluded secondary type", () => {
    for (const s of ["Live", "Soundtrack", "Spokenword", "Interview", "Audiobook", "Remix", "DJ-mix", "Demo"]) {
      expect(releaseType("Album", [s]), s).toBeNull();
    }
  });

  it("drops a release even when an excluded type sits next to an allowed one", () => {
    expect(releaseType("Album", ["Compilation", "Live"])).toBeNull();
  });

  it("prefers mixtape over compilation, and both over the primary type", () => {
    expect(releaseType("Album", ["Mixtape/Street"])).toBe("Mixtape");
    expect(releaseType("Album", ["Compilation", "Mixtape/Street"])).toBe("Mixtape");
    expect(releaseType("Single", ["Compilation"])).toBe("Compilation");
  });

  it("returns null for broadcast, other, or untyped groups", () => {
    expect(releaseType("Broadcast", [])).toBeNull();
    expect(releaseType("Other", [])).toBeNull();
    expect(releaseType(null, null)).toBeNull();
    expect(releaseType(undefined, [])).toBeNull();
  });
});

describe("firstSentence", () => {
  it("returns the first sentence", () => {
    expect(firstSentence("Aja is the sixth album. It was released in 1977.")).toBe("Aja is the sixth album.");
  });

  it("doesn't split after a period followed by a digit or lowercase word", () => {
    expect(firstSentence("Vol. 2 is a record. Second sentence.")).toBe("Vol. 2 is a record.");
    expect(firstSentence("It sold approx. ten copies. Then more.")).toBe("It sold approx. ten copies.");
  });

  it("KNOWN BUG: splits after a capitalised initial such as 'J. Cole'", () => {
    // The function's own comment says "J. Cole" shouldn't cut the sentence short, but the
    // regex breaks on any ". " followed by a capital. Pinned here as current behaviour.
    // Fixing it is bug-fix work, not handoff 01. When it's fixed, update this test.
    expect(firstSentence("A record by J. Cole and friends. Second sentence.")).toBe("A record by J.");
  });

  it("splits before an opening quote or parenthesis", () => {
    expect(firstSentence('It ends here! "Quoted" begins.')).toBe("It ends here!");
    expect(firstSentence("Is it? (Yes.)")).toBe("Is it?");
  });

  it("returns the whole text when there is no sentence break", () => {
    expect(firstSentence("  No full stop here  ")).toBe("No full stop here");
  });

  it("returns null for empty or whitespace-only text", () => {
    expect(firstSentence("")).toBeNull();
    expect(firstSentence("   ")).toBeNull();
  });

  it("truncates sentences longer than 260 characters with an ellipsis", () => {
    const long = "a".repeat(300);
    const out = firstSentence(long)!;
    expect(out).toHaveLength(258);
    expect(out.endsWith("…")).toBe(true);
  });
});
