// @vitest-environment jsdom
import { expect, it } from "vitest";
import { localizeError, setLocale } from "../src/i18n/i18n";

it("classifies Firebase errors without mislabeling unknown errors as network failures",()=>{
  setLocale("en");
  expect(localizeError({code:"database/permission-denied"})).toContain("DATABASE ACCESS WAS DENIED");
  expect(localizeError({code:"auth/operation-not-allowed"})).toContain("AUTHENTICATION FAILED");
  expect(localizeError({code:"auth/network-request-failed"})).toContain("NETWORK CONNECTION");
  expect(localizeError(new Error("SOME INTERNAL BUG"))).toContain("UNEXPECTED ERROR");
});
