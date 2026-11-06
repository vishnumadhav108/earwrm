import { describe, expect, it } from "vitest";
import { initialsOf } from "@/lib/cover";

describe("initialsOf", () => {
  it("uses the first letter of the first two words", () => {
    expect(initialsOf("In Rainbows")).toBe("IR");
    expect(initialsOf("To Pimp a Butterfly")).toBe("TP");
  });

  it("uses the first two letters of a single word", () => {
    expect(initialsOf("Aja")).toBe("AJ");
    expect(initialsOf("x")).toBe("X");
  });

  it("ignores punctuation", () => {
    expect(initialsOf("...And Justice for All")).toBe("AJ");
    expect(initialsOf("Hail to the Thief!")).toBe("HT");
  });

  it("treats an apostrophe as a word break (current behaviour)", () => {
    // "What's" becomes "What s", so the second initial is S, not T.
    expect(initialsOf("(What's the Story) Morning Glory?")).toBe("WS");
  });

  it("handles letters and digits outside ASCII", () => {
    expect(initialsOf("Björk Homogenic")).toBe("BH");
    expect(initialsOf("1999")).toBe("19");
    expect(initialsOf("ÆON flux")).toBe("ÆF");
  });

  it("returns ?? when nothing usable is left", () => {
    expect(initialsOf("")).toBe("??");
    expect(initialsOf("!!! ???")).toBe("??");
  });
});
