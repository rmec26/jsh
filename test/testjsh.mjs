//@ts-check

import test, { beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import { BadCallError, JSH, NoValueFoundError, checkTypeOf } from "../src/jsh.mjs";
import { baseData } from "./baseData.mjs";

describe("JSH Type Checker", () => {
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

  function testAllCases(typeToTest, ...results) {
    if (results.length !== testValues.length) {
      throw new Error(`Invalid number of test cases, expected ${testValues.length}, given ${results.length}`);
    }
    testValues.forEach((v, i) => {
      let expectedResult = results[i];
      if (expectedResult === null) {
        test(`should return the given value '${JSON.stringify(v)}' with the type '${typeToTest}'`, () => {
          assert.deepStrictEqual(checkTypeOf(v, typeToTest), [v]);
        });
      } else if (expectedResult instanceof Array) {
        test(`should return ${JSON.stringify(expectedResult)} for the value '${JSON.stringify(v)}' with the type '${typeToTest}'`, () => {
          assert.deepStrictEqual(checkTypeOf(v, typeToTest), expectedResult);
        });
      } else {
        test(`should return the expected error for the value '${JSON.stringify(v)}' with the type '${typeToTest}'`, () => {
          assert.deepStrictEqual(checkTypeOf(v, typeToTest), [null, expectedResult]);
        });
      }
    })
  }

  describe("'any' type", () => {
    testAllCases("any",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    );
  });

  describe("'string' type", () => {
    testAllCases("string",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      "number is not string",
      "number is not string",
      "number is not string",
      "number is not string",
      "number is not string",
      "boolean is not string",
      "boolean is not string",
      "null is not string",
      "object is not string",
      "object is not string",
      "object is not string",
      "object is not string",
      "array is not string",
      "array is not string",
      "array is not string",
      "array is not string",
    );
  });

  describe("'number' type", () => {
    testAllCases("number",
      "string is not number",
      "string is not number",
      "string is not number",
      "string is not number",
      "string is not number",
      "string is not number",
      "string is not number",
      "string is not number",
      "string is not number",
      null,
      null,
      null,
      null,
      null,
      "boolean is not number",
      "boolean is not number",
      "null is not number",
      "object is not number",
      "object is not number",
      "object is not number",
      "object is not number",
      "array is not number",
      "array is not number",
      "array is not number",
      "array is not number",
    );
  });

  describe("'boolean' type", () => {
    testAllCases("boolean",
      "string is not boolean",
      "string is not boolean",
      "string is not boolean",
      "string is not boolean",
      "string is not boolean",
      "string is not boolean",
      "string is not boolean",
      "string is not boolean",
      "string is not boolean",
      "number is not boolean",
      "number is not boolean",
      "number is not boolean",
      "number is not boolean",
      "number is not boolean",
      null,
      null,
      "null is not boolean",
      "object is not boolean",
      "object is not boolean",
      "object is not boolean",
      "object is not boolean",
      "array is not boolean",
      "array is not boolean",
      "array is not boolean",
      "array is not boolean",
    );
  });

  describe("'null' type", () => {
    testAllCases("null",
      "string is not null",
      "string is not null",
      "string is not null",
      "string is not null",
      "string is not null",
      "string is not null",
      "string is not null",
      "string is not null",
      "string is not null",
      "number is not null",
      "number is not null",
      "number is not null",
      "number is not null",
      "number is not null",
      "boolean is not null",
      "boolean is not null",
      null,
      "object is not null",
      "object is not null",
      "object is not null",
      "object is not null",
      "array is not null",
      "array is not null",
      "array is not null",
      "array is not null",
    );
  });

  describe("'object' type", () => {
    testAllCases("object",
      "string is not object",
      "string is not object",
      "string is not object",
      "string is not object",
      "string is not object",
      "string is not object",
      "string is not object",
      "string is not object",
      "string is not object",
      "number is not object",
      "number is not object",
      "number is not object",
      "number is not object",
      "number is not object",
      "boolean is not object",
      "boolean is not object",
      "null is not object",
      null,
      null,
      null,
      null,
      "array is not object",
      "array is not object",
      "array is not object",
      "array is not object",
    );
  });

  describe("'array' type", () => {
    testAllCases("array",
      "string is not array",
      "string is not array",
      "string is not array",
      "string is not array",
      "string is not array",
      "string is not array",
      "string is not array",
      "string is not array",
      "string is not array",
      "number is not array",
      "number is not array",
      "number is not array",
      "number is not array",
      "number is not array",
      "boolean is not array",
      "boolean is not array",
      "null is not array",
      "object is not array",
      "object is not array",
      "object is not array",
      "object is not array",
      null,
      null,
      null,
      null,
    );
  });

  describe("'integer' type", () => {
    testAllCases("integer",
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
      "Is a number but not an integer",
      null,
      null,
      "Is a number but not an integer",
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
    );
  });

  describe("'positive' type", () => {
    testAllCases("positive",
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
      "Is a number but not positive",
      "Is a number but not positive",
      "Is a number but not positive",
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
    );
  });

  describe("'negative' type", () => {
    testAllCases("negative",
      "string is not a number",
      "string is not a number",
      "string is not a number",
      "string is not a number",
      "string is not a number",
      "string is not a number",
      "string is not a number",
      "string is not a number",
      "string is not a number",
      "Is a number but not negative",
      "Is a number but not negative",
      "Is a number but not negative",
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
    );
  });

  describe("'zero' type", () => {
    testAllCases("zero",
      "string is not a number",
      "string is not a number",
      "string is not a number",
      "string is not a number",
      "string is not a number",
      "string is not a number",
      "string is not a number",
      "string is not a number",
      "string is not a number",
      "Is a number but not zero",
      "Is a number but not zero",
      null,
      "Is a number but not zero",
      "Is a number but not zero",
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
    );
  });

  describe("'path' type", () => {
    testAllCases("path",
      [["a string"]],
      [["a", "valid", "path"]],
      [["another", "valid.path"]],
      [["123"]],
      [["true"]],
      [["null"]],
      [["{}"]],
      [["[]"]],
      [[""]],
      "Path is not of the type string or array.",
      "Path is not of the type string or array.",
      "Path is not of the type string or array.",
      "Path is not of the type string or array.",
      "Path is not of the type string or array.",
      "Path is not of the type string or array.",
      "Path is not of the type string or array.",
      "Path is not of the type string or array.",
      "Path is not of the type string or array.",
      "Path is not of the type string or array.",
      "Path is not of the type string or array.",
      "Path is not of the type string or array.",
      "Path cannot be an empty array.",
      [["123", "678"]],
      [["str1", "str2"]],
      [["123", "678", "str1", "str2"]],
    );
  });

  describe("'[and,positive,integer]' type", () => {
    testAllCases(["and", "positive", "integer"],
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
      "Is a number but not an integer",
      "Is a number but not positive",
      "Is a number but not positive",
      "Is a number but not positive",
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
    );
  });

  describe("'[or,number,string]' type", () => {
    testAllCases(["or", "number", "string"],
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      "boolean is not any of the types number, string",
      "boolean is not any of the types number, string",
      "null is not any of the types number, string",
      "object is not any of the types number, string",
      "object is not any of the types number, string",
      "object is not any of the types number, string",
      "object is not any of the types number, string",
      "array is not any of the types number, string",
      "array is not any of the types number, string",
      "array is not any of the types number, string",
      "array is not any of the types number, string",
    );
  });

  describe("'[array,string]' type", () => {
    testAllCases(["array", "string"],
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "number is not an array",
      "number is not an array",
      "number is not an array",
      "number is not an array",
      "number is not an array",
      "boolean is not an array",
      "boolean is not an array",
      "null is not an array",
      "object is not an array",
      "object is not an array",
      "object is not an array",
      "object is not an array",
      null,
      "Value 0 is not of the type string",
      null,
      "Value 0 is not of the type string",
    );
  });

  describe("'[array,number]' type", () => {
    testAllCases(["array", "number"],
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "number is not an array",
      "number is not an array",
      "number is not an array",
      "number is not an array",
      "number is not an array",
      "boolean is not an array",
      "boolean is not an array",
      "null is not an array",
      "object is not an array",
      "object is not an array",
      "object is not an array",
      "object is not an array",
      null,
      null,
      "Value 0 is not of the type number",
      "Value 2 is not of the type number",
    );
  });

  describe("'[array,[or,number,string]]' type", () => {
    testAllCases(["array", ["or", "number", "string"]],
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "string is not an array",
      "number is not an array",
      "number is not an array",
      "number is not an array",
      "number is not an array",
      "number is not an array",
      "boolean is not an array",
      "boolean is not an array",
      "null is not an array",
      "object is not an array",
      "object is not an array",
      "object is not an array",
      "object is not an array",
      null,
      null,
      null,
      null,
    );
  });

  describe("'[object,string]' type", () => {
    testAllCases(["object", "string"],
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "number is not an object",
      "number is not an object",
      "number is not an object",
      "number is not an object",
      "number is not an object",
      "boolean is not an object",
      "boolean is not an object",
      "null is not an object",
      null,
      "Value a is not of the type string",
      null,
      "Value a is not of the type string",
      "array is not an object",
      "array is not an object",
      "array is not an object",
      "array is not an object",
    );
  });

  describe("'[object,number]' type", () => {
    testAllCases(["object", "number"],
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "number is not an object",
      "number is not an object",
      "number is not an object",
      "number is not an object",
      "number is not an object",
      "boolean is not an object",
      "boolean is not an object",
      "null is not an object",
      null,
      null,
      "Value c is not of the type number",
      "Value c is not of the type number",
      "array is not an object",
      "array is not an object",
      "array is not an object",
      "array is not an object",
    );
  });

  describe("'[object,[or,number,string]]' type", () => {
    testAllCases(["object", ["or", "number", "string"]],
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "string is not an object",
      "number is not an object",
      "number is not an object",
      "number is not an object",
      "number is not an object",
      "number is not an object",
      "boolean is not an object",
      "boolean is not an object",
      "null is not an object",
      null,
      null,
      null,
      null,
      "array is not an object",
      "array is not an object",
      "array is not an object",
      "array is not an object",
    );
  });

  describe("'invalid' type", () => {
    testAllCases("invalid",
      "string is not invalid",
      "string is not invalid",
      "string is not invalid",
      "string is not invalid",
      "string is not invalid",
      "string is not invalid",
      "string is not invalid",
      "string is not invalid",
      "string is not invalid",
      "number is not invalid",
      "number is not invalid",
      "number is not invalid",
      "number is not invalid",
      "number is not invalid",
      "boolean is not invalid",
      "boolean is not invalid",
      "null is not invalid",
      "object is not invalid",
      "object is not invalid",
      "object is not invalid",
      "object is not invalid",
      "array is not invalid",
      "array is not invalid",
      "array is not invalid",
      "array is not invalid",
    );
  });

  describe("invalid number type", () => {
    testAllCases(123,
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
      "Type must be a string or an array",
    );
  });

  describe("empty array type", () => {
    testAllCases([],
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
      "[] is not a valid array type",
    );
  });

  describe("invalid array type", () => {
    testAllCases(["invalid"],
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
      "[\"invalid\"] is not a valid array type",
    );
  });

  describe("invalid main array type", () => {
    testAllCases(["invalidMain", "string"],
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
      "invalidmain is not a valid main type for an array type",
    );
  });
});


describe("JSH Base Function", () => {
  let jsh;

  beforeEach(() => {
    jsh = new JSH("JSH-Test");
    jsh.setValue("root", baseData())
  })

  describe("get", () => {
    test("should return the desired value if given a valid path string", () => {
      assert.strictEqual(jsh.evalJsh(`(get root.books.book1.name)`), "Book 1");
    });
    test("should return the desired value if given a valid path array", () => {
      assert.strictEqual(jsh.evalJsh(`(get [root,books,book2,price])`), 15.75);
    });
    test("should throw a NoValueFoundError if the given path string doesn't exist", () => {
      assert.throws(() => jsh.evalJsh(`(get invalidPath)`), (err) => {
        assert(err instanceof NoValueFoundError);
        assert.strictEqual(err.message, "The value invalidPath doesn't exist.");
        return true;
      });
    });
    test("should throw a NoValueFoundError if the given path array doesn't exist", () => {
      assert.throws(() => jsh.evalJsh(`(get [invalid,path])`), (err) => {
        assert(err instanceof NoValueFoundError);
        assert.strictEqual(err.message, "The value invalid doesn't exist.");
        return true;
      });
    });
    test("should throw a BadCallError if the given path array is empty", () => {
      assert.throws(() => jsh.evalJsh(`(get [])`), (err) => {
        assert(err instanceof BadCallError);
        assert.strictEqual(err.message, "Error on 'get':\n  For (get, path): Argument 0 is invalid: Path cannot be an empty array.");
        return true;
      });
    });
  });

  describe("set", () => {
    test("should set the desired value if given a valid path string", () => {
      assert.strictEqual(jsh.evalJsh(`(set testValue "this is a test")`), undefined);
      assert.strictEqual(jsh.getValue("testValue"), "this is a test");
    });

    test("should set the desired value if the parent value is an object", () => {
      assert.strictEqual(jsh.evalJsh(`(set root.values.obj.test 1234)`), undefined);
      assert.strictEqual(jsh.getValue("root.values.obj.test"), 1234);
    });

    test("should set the desired value if the parent value is an array", () => {
      assert.strictEqual(jsh.evalJsh(`(set root.values.array.0 445)`), undefined);
      assert.strictEqual(jsh.getValue("root.values.array.0"), 445);
    });

    test("should add null values if the desired value goes over the size of the parent and the parent value is an array", () => {
      assert.strictEqual(jsh.evalJsh(`(set root.values.array.+2 555)`), undefined);
      assert.deepStrictEqual(jsh.getValue("root.values.array"), [...baseData().values.array, null, 555]);
    });

    test("should throw a NoValueFoundError if the parent value doesn't exist", () => {
      assert.throws(() => jsh.evalJsh(`(set root.values.obj.noVal.hi 999)`), (err) => {
        assert(err instanceof NoValueFoundError);
        assert.strictEqual(err.message, "The value root.values.obj.noVal doesn't exist.");
        return true;
      });
    });

    test("should throw a BadCallError if trying to set a level in a string parent value.", () => {
      assert.throws(() => jsh.evalJsh(`(set root.values.str.test 1234)`), (err) => {
        assert(err instanceof BadCallError);
        assert.strictEqual(err.message, "The value 'root.values.str' is not an object/array.");
        return true;
      });
    });

    test("should throw a BadCallError if trying to set a level in a number parent value.", () => {
      assert.throws(() => jsh.evalJsh(`(set root.values.num.test 1234)`), (err) => {
        assert(err instanceof BadCallError);
        assert.strictEqual(err.message, "The value 'root.values.num' is not an object/array.");
        return true;
      });
    });

    test("should throw a BadCallError if trying to set a level in a boolean parent value.", () => {
      assert.throws(() => jsh.evalJsh(`(set root.values.bool.test 1234)`), (err) => {
        assert(err instanceof BadCallError);
        assert.strictEqual(err.message, "The value 'root.values.bool' is not an object/array.");
        return true;
      });
    });

    test("should throw a BadCallError if trying to set a level in a null parent value.", () => {
      assert.throws(() => jsh.evalJsh(`(set root.values.nullVal.test 1234)`), (err) => {
        assert(err instanceof BadCallError);
        assert.strictEqual(err.message, "The value 'root.values.nullVal' is not an object/array.");
        return true;
      });
    });

    test("should throw a BadCallError if trying to set a non number level in an array parent value.", () => {
      assert.throws(() => jsh.evalJsh(`(set root.values.array.test 1234)`), (err) => {
        assert(err instanceof BadCallError);
        assert.strictEqual(err.message, "The level 'test' is not valid for the array 'root.values.array'.");
        return true;
      });
    });
  });

  describe("delete", () => {
    test("should delete and return the desired value from an object if given a valid path string", () => {
      jsh.evalJsh(`(set test {a:1234,b:"abc"})`)
      assert.strictEqual(jsh.evalJsh(`(delete test.a)`), 1234);
      assert.deepStrictEqual(jsh.getValue("test"), { b: "abc" });
    });

    test("should delete and return the desired value from an array if given a valid path string", () => {
      jsh.evalJsh(`(set test [111,222,333])`)
      assert.strictEqual(jsh.evalJsh(`(delete test.1)`), 222);
      assert.deepStrictEqual(jsh.getValue("test"), [111, 333]);
    });
  });

  describe("run", () => {
    test("should run all given inputs and return nothing", () => {
      assert.strictEqual(jsh.evalJsh(`(run (set aaa neat) (get root))`), undefined);
      assert.strictEqual(jsh.getValue("aaa"), "neat");
    });
  });

  describe("runr", () => {
    test("should run all given inputs and return the last returned value", () => {
      assert.strictEqual(jsh.evalJsh(`(runr "hello" (get root.values.num) (set aaa yo))`), 123);
      assert.strictEqual(jsh.getValue("aaa"), "yo");
    });
  });

  describe("map", () => {
    describe("(map, inputValue, valuePath, keyPath, mapping)", () => {
      test("should map all values from an array", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(map @root.list val index {pos:@index,name:@val.name})`), [
          {
            pos: "0",
            name: "Test 1"
          },
          {
            pos: "1",
            name: "Test 2"
          },
          {
            pos: "2",
            name: "Test 3"
          },
          {
            pos: "3",
            name: "Test 4"
          }
        ]);
      });
      test("should map all values from an object", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(map @root.books val key {key:@key,name:@val.name})`), [
          {
            key: "book1",
            name: "Book 1"
          },
          {
            key: "book2",
            name: "Book 2"
          },
          {
            key: "book3",
            name: "Book 3"
          },
          {
            key: "book4",
            name: "Book 4"
          }
        ]);
      });
      test("should map all values from a string", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(map "hello" char index {pos:@index,char:@char})`), [
          {
            pos: "0",
            char: "h"
          },
          {
            pos: "1",
            char: "e"
          },
          {
            pos: "2",
            char: "l"
          },
          {
            pos: "3",
            char: "l"
          },
          {
            pos: "4",
            char: "o"
          }
        ]);
      });
      test("should only include values that were returned", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(map @root.list val index (if (eq @index "2") {pos:@index,name:@val.name}))`), [
          {
            pos: "2",
            name: "Test 3"
          }
        ]);
      });
    });
    describe("(map, inputValue, valuePath, mapping)", () => {
      test("should map all values from an array", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(map @root.list val @val.name)`), [
          "Test 1",
          "Test 2",
          "Test 3",
          "Test 4"
        ]);
      });
      test("should map all values from an object", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(map @root.books val @val.name)`), [
          "Book 1",
          "Book 2",
          "Book 3",
          "Book 4"
        ]);
      });
      test("should map all values from a string", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(map "hello" char @char)`), [
          "h",
          "e",
          "l",
          "l",
          "o"
        ]);
      });
      test("should only include values that were returned", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(map @root.books val (if (eq @val.id "789") @val.name))`), [
          "Book 3"
        ]);
      });
    });
  });

  describe("kmap", () => {
    describe("(kmap, inputValue, valuePath, keyPath, mapping)", () => {
      test("should map all values from an array", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(kmap @root.list val index {k:@index,v:@val.name})`),
          {
            "0": "Test 1",
            "1": "Test 2",
            "2": "Test 3",
            "3": "Test 4"
          }
        );
      });
      test("should map all values from an object", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(kmap @root.books val key {k:@val.id,v:@key})`),
          {
            "123": "book1",
            "456": "book2",
            "789": "book3",
            "321": "book4",
          }
        );
      });
      test("should map all values from a string", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(kmap "hello" char index {k:@index,v:@char})`),
          {
            "0": "h",
            "1": "e",
            "2": "l",
            "3": "l",
            "4": "o"
          }
        );
      });
      test("should only include values that were returned", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(kmap @root.list val index (if (eq @index "2") {k:@index,v:@val.name}))`),
          {
            "2": "Test 3"
          }
        );
      });
    });
    describe("(kmap, inputValue, valuePath, mapping)", () => {
      test("should map all values from an array", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(kmap @root.list val {k:@val.id,v:@val.name})`),
          {
            "111": "Test 1",
            "222": "Test 2",
            "333": "Test 3",
            "444": "Test 4"
          }
        );
      });
      test("should map all values from an object", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(kmap @root.books val {k:@val.id,v:@val.author})`),
          {
            "123": "Author 1",
            "456": "Author 2",
            "789": "Author 1",
            "321": "Author 3",
          }
        );
      });
      test("should map all values from a string", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(kmap "hello" char {k:@char,v:@char})`),
          {
            "h": "h",
            "e": "e",
            "l": "l",
            "o": "o"
          }
        );
      });
      test("should only include values that were returned", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(kmap @root.list val (if (eq @val.id "333") {k:@val.name,v:@val.value}))`),
          {
            "Test 3": 91
          }
        );
      });
    });
  });

  describe("for", () => {
    describe("(for, inputValue, valuePath, keyPath, mapping)", () => {
      test("should process all values from an array", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(for @root.list val index (join [@index,":",@val.name]))`), "3:Test 4");
      });
      test("should process all values from an object", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(for @root.books val key (join [@val.id,":",@key]))`), "321:book4");
      });
      test("should process all values from a string", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(for "hello" char index (join [@index,":",@char]))`), "4:o");
      });
      test("should only include values that were returned", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(for @root.list val index (if (eq @index "2") (join [@index,":",@val.name])))`), "2:Test 3");
      });
    });
    describe("(for, inputValue, valuePath,  mapping)", () => {
      test("should process all values from an array", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(for @root.list val @val.name)`), "Test 4");
      });
      test("should process all values from an object", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(for @root.books val @val.id)`), "321");
      });
      test("should process all values from a string", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(for "hello" char @char)`), "o");
      });
      test("should only include values that were returned", () => {
        assert.deepStrictEqual(jsh.evalJsh(`(for @root.list val (if (eq @val.id "333") @val.name))`), "Test 3");
      });
    });
  });
}); 