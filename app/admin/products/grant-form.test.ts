import { describe, expect, it } from "vitest";
import {
  collapseApiGrantsToFormRows,
  emptyGrantFormRow,
  expandGrantFormRowsToApi,
  formatGrantLabels,
  hasDuplicateScopeTypes,
  usedScopeTypes,
} from "./grant-form";
import type { GrantScopeOptions } from "./grant-options";

describe("grant-form", () => {
  it("expands multi-select rows into API grants with dedupe", () => {
    expect(
      expandGrantFormRowsToApi([
        { scopeType: "EXAM", scopeIds: ["e1", "e2", "e1"] },
        { scopeType: "MOCK_TEST", scopeIds: ["m1"] },
        { scopeType: "EXAM_GROUP", scopeIds: [] },
      ])
    ).toEqual([
      { scopeType: "EXAM", scopeId: "e1" },
      { scopeType: "EXAM", scopeId: "e2" },
      { scopeType: "MOCK_TEST", scopeId: "m1" },
    ]);
  });

  it("collapses API grants into one row per scope type", () => {
    expect(
      collapseApiGrantsToFormRows([
        { scopeType: "EXAM", scopeId: "e1" },
        { scopeType: "MOCK_TEST", scopeId: "m1" },
        { scopeType: "EXAM", scopeId: "e2" },
        { scopeType: "EXAM", scopeId: "e1" },
      ])
    ).toEqual([
      { scopeType: "EXAM", scopeIds: ["e1", "e2"] },
      { scopeType: "MOCK_TEST", scopeIds: ["m1"] },
    ]);
  });

  it("returns an empty row when collapsing nothing", () => {
    expect(collapseApiGrantsToFormRows([])).toEqual([emptyGrantFormRow()]);
    expect(collapseApiGrantsToFormRows(undefined)).toEqual([
      emptyGrantFormRow(),
    ]);
  });

  it("detects duplicate scope types across rows", () => {
    expect(
      hasDuplicateScopeTypes([
        { scopeType: "EXAM", scopeIds: ["e1"] },
        { scopeType: "EXAM", scopeIds: ["e2"] },
      ])
    ).toBe(true);
    expect(
      hasDuplicateScopeTypes([
        { scopeType: "EXAM", scopeIds: ["e1"] },
        { scopeType: "MOCK_TEST", scopeIds: ["m1"] },
      ])
    ).toBe(false);
  });

  it("lists used scope types excluding a row index", () => {
    const rows = [
      { scopeType: "EXAM" as const, scopeIds: ["e1"] },
      { scopeType: "MOCK_TEST" as const, scopeIds: ["m1"] },
    ];
    expect(usedScopeTypes(rows)).toEqual(new Set(["EXAM", "MOCK_TEST"]));
    expect(usedScopeTypes(rows, 0)).toEqual(new Set(["MOCK_TEST"]));
  });

  it("formats grant labels with names and falls back to scope type", () => {
    const options: GrantScopeOptions = {
      EXAM_GROUP: [{ value: "g1", label: "SSC CGL" }],
      EXAM: [],
      MOCK_TEST: [
        { value: "m1", label: "Narration 01" },
        { value: "m2", label: "Narration 02" },
      ],
    };

    expect(
      formatGrantLabels(
        [
          { scopeType: "MOCK_TEST", scopeId: "m1" },
          { scopeType: "MOCK_TEST", scopeId: "m2" },
          { scopeType: "MOCK_TEST", scopeId: "missing" },
          { scopeType: "EXAM_GROUP", scopeId: "g1" },
        ],
        options
      )
    ).toBe("Narration 01, Narration 02, MOCK_TEST, SSC CGL");

    expect(formatGrantLabels([], options)).toBe("-");
  });
});
