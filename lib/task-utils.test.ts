import { describe, expect, it } from "vitest";
import { getTaskTitleError, MAX_TASK_TITLE_LENGTH } from "./task-utils";

describe("getTaskTitleError", () => {
  it("rejects empty and whitespace-only tasks", () => {
    expect(getTaskTitleError("")).toBe("Write a task before adding it.");
    expect(getTaskTitleError(" \n\t ")).toBe("Write a task before adding it.");
  });

  it("rejects titles longer than the database limit", () => {
    expect(getTaskTitleError("a".repeat(MAX_TASK_TITLE_LENGTH + 1))).toBe(
      `Tasks must be ${MAX_TASK_TITLE_LENGTH} characters or fewer.`,
    );
  });

  it("accepts valid titles including the maximum length", () => {
    expect(getTaskTitleError("  Buy groceries  ")).toBeNull();
    expect(getTaskTitleError("a".repeat(MAX_TASK_TITLE_LENGTH))).toBeNull();
  });
});
