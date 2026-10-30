import { describe, expect, it } from "vitest";
import { assertOfflineCourse } from "./offline-course";

describe("assertOfflineCourse", () => {
  it("aceita o curso de ingles", () => {
    expect(() => assertOfflineCourse("en")).not.toThrow();
  });

  it("recusa outro curso com mensagem clara", () => {
    expect(() => assertOfflineCourse("vmw")).toThrow(/offline.*"vmw".*"en"/);
  });
});
