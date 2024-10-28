//@ts-check

import { describe } from "node:test";
import { overwriteExpects, testAllCases } from "../utils.mjs";

const baseNumberExpect = [
  "string is not a number",
  "string is not a number",
  "string is not a number",
  "string is not a number",
  "string is not a number",
  "string is not a number",
  "string is not a number",
  "string is not a number",
  "string is not a number",
  null,
  null,
  null,
  null,
  null,
  "boolean is not a number",
  "boolean is not a number",
  "null is not a number",
  "object is not a number",
  "object is not a number",
  "object is not a number",
  "object is not a number",
  "array is not a number",
  "array is not a number",
  "array is not a number",
  "array is not a number",
]
function overwriteToInteger(baseExpect) {
  return overwriteExpects(baseExpect, {
    "10": "Is a number but not an integer",
    "13": "Is a number but not an integer",
  })
}

const expectedPositiveOnly = overwriteExpects(baseNumberExpect, {
  "11": "Is a number but not positive",
  "12": "Is a number but not positive",
  "13": "Is a number but not positive",
});

const expectedNegativeOnly = overwriteExpects(baseNumberExpect, {
  "9": "Is a number but not negative",
  "10": "Is a number but not negative",
  "11": "Is a number but not negative",
});

const expectedZeroOnly = overwriteExpects(baseNumberExpect, {
  "9": "Is a number but not zero",
  "10": "Is a number but not zero",
  "12": "Is a number but not zero",
  "13": "Is a number but not zero",
});

const expectedNonNegative = overwriteExpects(baseNumberExpect, {
  "12": "Is a number but its negative",
  "13": "Is a number but its negative",
});

const expectedNonPositive = overwriteExpects(baseNumberExpect, {
  "9": "Is a number but its positive",
  "10": "Is a number but its positive",
});

const expectedNonZero = overwriteExpects(baseNumberExpect, {
  "11": "Is a number but its zero",
});

describe("Complex Number/Integer Type Checking", () => {
  describe("Number Type", () => {
    describe("Positive Only", () => {
      describe("'[number, positive]' type", () => {
        testAllCases(["number", "positive"], ...expectedPositiveOnly);
      });
      describe("'[number, pos]' type", () => {
        testAllCases(["number", "pos"], ...expectedPositiveOnly);
      });
      describe("'[number, p]' type", () => {
        testAllCases(["number", "p"], ...expectedPositiveOnly);
      });
      describe("'[number, +]' type", () => {
        testAllCases(["number", "+"], ...expectedPositiveOnly);
      });
    });

    describe("Negative Only", () => {
      describe("'[number, negative]' type", () => {
        testAllCases(["number", "negative"], ...expectedNegativeOnly);
      });
      describe("'[number, neg]' type", () => {
        testAllCases(["number", "neg"], ...expectedNegativeOnly);
      });
      describe("'[number, n]' type", () => {
        testAllCases(["number", "n"], ...expectedNegativeOnly);
      });
      describe("'[number, -]' type", () => {
        testAllCases(["number", "-"], ...expectedNegativeOnly);
      });
    });

    describe("Zero Only", () => {
      describe("'[number, zero]' type", () => {
        testAllCases(["number", "zero"], ...expectedZeroOnly);
      });
      describe("'[number, z]' type", () => {
        testAllCases(["number", "z"], ...expectedZeroOnly);
      });
    });

    describe("Non Negative", () => {
      describe("'[number, positive, zero]' type", () => {
        testAllCases(["number", "positive", "zero"], ...expectedNonNegative);
      });
      describe("'[number, p, z]' type", () => {
        testAllCases(["number", "p", "z"], ...expectedNonNegative);
      });
      describe("'[number, pz]' type", () => {
        testAllCases(["number", "pz"], ...expectedNonNegative);
      });
      describe("'[number, +z]' type", () => {
        testAllCases(["number", "+z"], ...expectedNonNegative);
      });
    });

    describe("Non Positive", () => {
      describe("'[number, negative, zero]' type", () => {
        testAllCases(["number", "negative", "zero"], ...expectedNonPositive);
      });
      describe("'[number, n, z]' type", () => {
        testAllCases(["number", "n", "z"], ...expectedNonPositive);
      });
      describe("'[number, nz]' type", () => {
        testAllCases(["number", "nz"], ...expectedNonPositive);
      });
      describe("'[number, -z]' type", () => {
        testAllCases(["number", "-z"], ...expectedNonPositive);
      });
    });

    describe("Non Zero", () => {
      describe("'[number, positive, negative]' type", () => {
        testAllCases(["number", "positive", "negative"], ...expectedNonZero);
      });
      describe("'[number, p, n]' type", () => {
        testAllCases(["number", "p", "n"], ...expectedNonZero);
      });
      describe("'[number, pn]' type", () => {
        testAllCases(["number", "pn",], ...expectedNonZero);
      });
      describe("'[number, +-]' type", () => {
        testAllCases(["number", "+-"], ...expectedNonZero);
      });
    });

    describe("All numbers", () => {
      describe("'[number, positive, negative, zero]' type", () => {
        testAllCases(["number", "positive", "negative", "zero"], ...baseNumberExpect);
      });
      describe("'[number, p, n, z]' type", () => {
        testAllCases(["number", "p", "n", "z"], ...baseNumberExpect);
      });
      describe("'[number,pnz]' type", () => {
        testAllCases(["number", "pnz"], ...baseNumberExpect);
      });
      describe("'[number, +-z]' type", () => {
        testAllCases(["number", "+-z"], ...baseNumberExpect);
      });
    });
  });

  describe("Integer Type", () => {
    describe("Positive Only", () => {
      describe("'[integer, positive]' type", () => {
        testAllCases(["integer", "positive"], ...overwriteToInteger(expectedPositiveOnly));
      });
      describe("'[integer, pos]' type", () => {
        testAllCases(["integer", "pos"], ...overwriteToInteger(expectedPositiveOnly));
      });
      describe("'[integer, p]' type", () => {
        testAllCases(["integer", "p"], ...overwriteToInteger(expectedPositiveOnly));
      });
      describe("'[integer, +]' type", () => {
        testAllCases(["integer", "+"], ...overwriteToInteger(expectedPositiveOnly));
      });
    });

    describe("Negative Only", () => {
      describe("'[integer, negative]' type", () => {
        testAllCases(["integer", "negative"], ...overwriteToInteger(expectedNegativeOnly));
      });
      describe("'[integer, neg]' type", () => {
        testAllCases(["integer", "neg"], ...overwriteToInteger(expectedNegativeOnly));
      });
      describe("'[integer, n]' type", () => {
        testAllCases(["integer", "n"], ...overwriteToInteger(expectedNegativeOnly));
      });
      describe("'[integer, -]' type", () => {
        testAllCases(["integer", "-"], ...overwriteToInteger(expectedNegativeOnly));
      });
    });

    describe("Zero Only", () => {
      describe("'[integer, zero]' type", () => {
        testAllCases(["integer", "zero"], ...overwriteToInteger(expectedZeroOnly));
      });
      describe("'[integer, z]' type", () => {
        testAllCases(["integer", "z"], ...overwriteToInteger(expectedZeroOnly));
      });
    });

    describe("Non Negative", () => {
      describe("'[integer, positive, zero]' type", () => {
        testAllCases(["integer", "positive", "zero"], ...overwriteToInteger(expectedNonNegative));
      });
      describe("'[integer, p, z]' type", () => {
        testAllCases(["integer", "p", "z"], ...overwriteToInteger(expectedNonNegative));
      });
      describe("'[integer, pz]' type", () => {
        testAllCases(["integer", "pz"], ...overwriteToInteger(expectedNonNegative));
      });
      describe("'[integer, +z]' type", () => {
        testAllCases(["integer", "+z"], ...overwriteToInteger(expectedNonNegative));
      });
    });

    describe("Non Positive", () => {
      describe("'[integer, negative, zero]' type", () => {
        testAllCases(["integer", "negative", "zero"], ...overwriteToInteger(expectedNonPositive));
      });
      describe("'[integer, n, z]' type", () => {
        testAllCases(["integer", "n", "z"], ...overwriteToInteger(expectedNonPositive));
      });
      describe("'[integer, nz]' type", () => {
        testAllCases(["integer", "nz"], ...overwriteToInteger(expectedNonPositive));
      });
      describe("'[integer, -z]' type", () => {
        testAllCases(["integer", "-z"], ...overwriteToInteger(expectedNonPositive));
      });
    });

    describe("Non Zero", () => {
      describe("'[integer, positive, negative]' type", () => {
        testAllCases(["integer", "positive", "negative"], ...overwriteToInteger(expectedNonZero));
      });
      describe("'[integer, p, n]' type", () => {
        testAllCases(["integer", "p", "n"], ...overwriteToInteger(expectedNonZero));
      });
      describe("'[integer, pn]' type", () => {
        testAllCases(["integer", "pn",], ...overwriteToInteger(expectedNonZero));
      });
      describe("'[integer, +-]' type", () => {
        testAllCases(["integer", "+-"], ...overwriteToInteger(expectedNonZero));
      });
    });

    describe("All Numbers", () => {
      describe("'[integer, positive, negative, zero]' type", () => {
        testAllCases(["integer", "positive", "negative", "zero"], ...overwriteToInteger(baseNumberExpect));
      });
      describe("'[integer, p, n, z]' type", () => {
        testAllCases(["integer", "p", "n", "z"], ...overwriteToInteger(baseNumberExpect));
      });
      describe("'[integer,pnz]' type", () => {
        testAllCases(["integer", "pnz"], ...overwriteToInteger(baseNumberExpect));
      });
      describe("'[integer, +-z]' type", () => {
        testAllCases(["integer", "+-z"], ...overwriteToInteger(baseNumberExpect));
      });
    });
  });
});