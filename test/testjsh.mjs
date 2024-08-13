//@ts-check

import test, { beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import { BadCallError, JSH, NoValueFoundError } from "../src/jsh.mjs";
import { baseData } from "./baseData.mjs";


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
        assert.strictEqual(err.message, "Error on 'get':\n  For (get, path): Argument 0 isn't a valid path: Path cannot be an empty array.");
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
}); 