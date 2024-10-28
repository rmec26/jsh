//@ts-check

import test from "node:test";
import assert from "node:assert/strict";
import { checkTypeOf } from "../../src/jsh/types.mjs";


const testValues = [
  "a string",
  "a.valid.path",
  "another.valid\\.path",
  "123",
  "true",
  "null",
  "{}",
  "[]",
  "",
  123,
  41.65,
  0,
  -153,
  -5.14,
  true,
  false,
  null,
  {},
  {
    a: 123,
    b: 678,
  },
  {
    c: "str1",
    d: "str2",
  },
  {
    a: 123,
    b: 678,
    c: "str1",
    d: "str2",
  },
  [],
  [123, 678],
  ["str1", "str2"],
  [123, 678, "str1", "str2"],
]

export function testAllCases(typeToTest, ...results) {
  if (results.length !== testValues.length) {
    throw new Error(`Invalid number of test cases, expected ${testValues.length}, given ${results.length}`);
  }
  testValues.forEach((v, i) => {
    let expectedResult = results[i];
    if (expectedResult === null) {
      test(`should return the given value '${JSON.stringify(v)}' (${i}) with the type '${typeToTest}'`, () => {
        assert.deepStrictEqual(checkTypeOf(v, typeToTest), [v]);
      });
    } else if (expectedResult instanceof Array) {
      test(`should return ${JSON.stringify(expectedResult)} for the value '${JSON.stringify(v)}' (${i}) with the type '${typeToTest}'`, () => {
        assert.deepStrictEqual(checkTypeOf(v, typeToTest), expectedResult);
      });
    } else {
      test(`should return the expected error for the value '${JSON.stringify(v)}' (${i}) with the type '${typeToTest}'`, () => {
        assert.deepStrictEqual(checkTypeOf(v, typeToTest), [null, expectedResult]);
      });
    }
  })
}

export function overwriteExpects(baseExpects, newExpects) {
  let res = baseExpects.slice(0);
  for (const [k, v] of Object.entries(newExpects)) {
    res[k] = v;
  }
  return res;
}