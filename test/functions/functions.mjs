//@ts-check

import test, { beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import { BadCallError, JSH, NoValueFoundError } from "../../src/jsh/jsh.mjs";
import { baseData } from "./baseData.mjs";

describe("JSH Base Function", () => {
  let jsh;

  beforeEach(() => {
    jsh = new JSH("JSH-Test");
    jsh.setValue("root", baseData())
  })

  describe("get", () => {
    describe("(get, getPath)", () => {
      test("should return the desired value if given a valid path string", async () => {
        assert.strictEqual(await jsh.evalJsh(`(get root.books.book1.name)`), "Book 1");
      });
      test("should return the desired value if given a valid path array", async () => {
        assert.strictEqual(await jsh.evalJsh(`(get [root,books,book2,price])`), 15.75);
      });
      test("should throw a NoValueFoundError if the given path string doesn't exist", () => {
        assert.rejects(async () => await jsh.evalJsh(`(get invalidPath)`), (err) => {
          assert(err instanceof NoValueFoundError);
          assert.strictEqual(err.message, "The value invalidPath doesn't exist.");
          return true;
        });
      });
      test("should throw a NoValueFoundError if the given path array doesn't exist", () => {
        assert.rejects(async () => await jsh.evalJsh(`(get [invalid,path])`), (err) => {
          assert(err instanceof NoValueFoundError);
          assert.strictEqual(err.message, "The value invalid doesn't exist.");
          return true;
        });
      });
      test("should throw a BadCallError if the given path array is empty", async () => {
        assert.rejects(async () => await jsh.evalJsh(`(get [])`), (err) => {
          assert(err instanceof BadCallError);
          assert.strictEqual(err.message, "Error on 'get':\n  For (get, path): Argument 0 is invalid: Path cannot be an empty array.");
          return true;
        });
      });
    });
  });

  describe("set", () => {
    describe("(set, setPath, newValue)", () => {
      test("should set the desired value if given a valid path string", async () => {
        assert.strictEqual(await jsh.evalJsh(`(set testValue "this is a test")`), undefined);
        assert.strictEqual(jsh.getValue("testValue"), "this is a test");
      });

      test("should set the desired value if the parent value is an object", async () => {
        assert.strictEqual(await jsh.evalJsh(`(set root.values.obj.test 1234)`), undefined);
        assert.strictEqual(jsh.getValue("root.values.obj.test"), 1234);
      });

      test("should set the desired value if the parent value is an array", async () => {
        assert.strictEqual(await jsh.evalJsh(`(set root.values.array.0 445)`), undefined);
        assert.strictEqual(jsh.getValue("root.values.array.0"), 445);
      });

      test("should add null values if the desired value goes over the size of the parent and the parent value is an array", async () => {
        assert.strictEqual(await jsh.evalJsh(`(set root.values.array.+2 555)`), undefined);
        assert.deepStrictEqual(jsh.getValue("root.values.array"), [...baseData().values.array, null, 555]);
      });

      test("should throw a NoValueFoundError if the parent value doesn't exist", () => {
        assert.rejects(async () => await jsh.evalJsh(`(set root.values.obj.noVal.hi 999)`), (err) => {
          assert(err instanceof NoValueFoundError);
          assert.strictEqual(err.message, "The value root.values.obj.noVal doesn't exist.");
          return true;
        });
      });

      test("should throw a BadCallError if trying to set a level in a string parent value.", () => {
        assert.rejects(async () => await jsh.evalJsh(`(set root.values.str.test 1234)`), (err) => {
          assert(err instanceof BadCallError);
          assert.strictEqual(err.message, "The value 'root.values.str' is not an object/array.");
          return true;
        });
      });

      test("should throw a BadCallError if trying to set a level in a number parent value.", () => {
        assert.rejects(async () => await jsh.evalJsh(`(set root.values.num.test 1234)`), (err) => {
          assert(err instanceof BadCallError);
          assert.strictEqual(err.message, "The value 'root.values.num' is not an object/array.");
          return true;
        });
      });

      test("should throw a BadCallError if trying to set a level in a boolean parent value.", () => {
        assert.rejects(async () => await jsh.evalJsh(`(set root.values.bool.test 1234)`), (err) => {
          assert(err instanceof BadCallError);
          assert.strictEqual(err.message, "The value 'root.values.bool' is not an object/array.");
          return true;
        });
      });

      test("should throw a BadCallError if trying to set a level in a null parent value.", () => {
        assert.rejects(async () => await jsh.evalJsh(`(set root.values.nullVal.test 1234)`), (err) => {
          assert(err instanceof BadCallError);
          assert.strictEqual(err.message, "The value 'root.values.nullVal' is not an object/array.");
          return true;
        });
      });

      test("should throw a BadCallError if trying to set a non number level in an array parent value.", () => {
        assert.rejects(async () => await jsh.evalJsh(`(set root.values.array.test 1234)`), (err) => {
          assert(err instanceof BadCallError);
          assert.strictEqual(err.message, "The level 'test' is not valid for the array 'root.values.array'.");
          return true;
        });
      });
    });
  });

  describe("delete", () => {
    describe("(delete, deletePath)", () => {
      test("should delete and return the desired value from an object if given a valid path string", async () => {
        await jsh.evalJsh(`(set test {a:1234,b:"abc"})`)
        assert.strictEqual(await jsh.evalJsh(`(delete test.a)`), 1234);
        assert.deepStrictEqual(jsh.getValue("test"), { b: "abc" });
      });

      test("should delete and return the desired value from an array if given a valid path string", async () => {
        await jsh.evalJsh(`(set test [111,222,333])`)
        assert.strictEqual(await jsh.evalJsh(`(delete test.1)`), 222);
        assert.deepStrictEqual(jsh.getValue("test"), [111, 333]);
      });
    });
  });

  describe("run", () => {
    describe("(run, ...input)", () => {
      test("should run all given inputs and return nothing", async () => {
        assert.strictEqual(await jsh.evalJsh(`(run (set aaa neat) (get root))`), undefined);
        assert.strictEqual(jsh.getValue("aaa"), "neat");
      });
    });
  });

  describe("runr", () => {
    describe("(runr, ...input)", () => {
      test("should run all given inputs and return the last returned value", async () => {
        assert.strictEqual(await jsh.evalJsh(`(runr "hello" (get root.values.num) (set aaa yo))`), 123);
        assert.strictEqual(jsh.getValue("aaa"), "yo");
      });
    });
  });

  describe("map", () => {
    describe("(map, inputValue, valuePath, keyPath, mapping)", () => {
      test("should map all values from an array", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(map @root.list val index {pos:@index,name:@val.name})`), [
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
      test("should map all values from an object", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(map @root.books val key {key:@key,name:@val.name})`), [
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
      test("should map all values from a string", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(map "hello" char index {pos:@index,char:@char})`), [
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
      test("should only include values that were returned", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(map @root.list val index (if (eq @index "2") {pos:@index,name:@val.name}))`), [
          {
            pos: "2",
            name: "Test 3"
          }
        ]);
      });
    });
    describe("(map, inputValue, valuePath, mapping)", () => {
      test("should map all values from an array", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(map @root.list val @val.name)`), [
          "Test 1",
          "Test 2",
          "Test 3",
          "Test 4"
        ]);
      });
      test("should map all values from an object", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(map @root.books val @val.name)`), [
          "Book 1",
          "Book 2",
          "Book 3",
          "Book 4"
        ]);
      });
      test("should map all values from a string", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(map "hello" char @char)`), [
          "h",
          "e",
          "l",
          "l",
          "o"
        ]);
      });
      test("should only include values that were returned", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(map @root.books val (if (eq @val.id "789") @val.name))`), [
          "Book 3"
        ]);
      });
    });
  });

  describe("kmap", () => {
    describe("(kmap, inputValue, valuePath, keyPath, mapping)", () => {
      test("should map all values from an array", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(kmap @root.list val index {k:@index,v:@val.name})`),
          {
            "0": "Test 1",
            "1": "Test 2",
            "2": "Test 3",
            "3": "Test 4"
          }
        );
      });
      test("should map all values from an object", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(kmap @root.books val key {k:@val.id,v:@key})`),
          {
            "123": "book1",
            "456": "book2",
            "789": "book3",
            "321": "book4",
          }
        );
      });
      test("should map all values from a string", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(kmap "hello" char index {k:@index,v:@char})`),
          {
            "0": "h",
            "1": "e",
            "2": "l",
            "3": "l",
            "4": "o"
          }
        );
      });
      test("should only include values that were returned", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(kmap @root.list val index (if (eq @index "2") {k:@index,v:@val.name}))`),
          {
            "2": "Test 3"
          }
        );
      });
    });
    describe("(kmap, inputValue, valuePath, mapping)", () => {
      test("should map all values from an array", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(kmap @root.list val {k:@val.id,v:@val.name})`),
          {
            "111": "Test 1",
            "222": "Test 2",
            "333": "Test 3",
            "444": "Test 4"
          }
        );
      });
      test("should map all values from an object", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(kmap @root.books val {k:@val.id,v:@val.author})`),
          {
            "123": "Author 1",
            "456": "Author 2",
            "789": "Author 1",
            "321": "Author 3",
          }
        );
      });
      test("should map all values from a string", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(kmap "hello" char {k:@char,v:@char})`),
          {
            "h": "h",
            "e": "e",
            "l": "l",
            "o": "o"
          }
        );
      });
      test("should only include values that were returned", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(kmap @root.list val (if (eq @val.id "333") {k:@val.name,v:@val.value}))`),
          {
            "Test 3": 91
          }
        );
      });
    });
  });

  describe("for", () => {
    describe("(for, inputValue, valuePath, keyPath, mapping)", () => {
      test("should process all values from an array", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(for @root.list val index (join [@index,":",@val.name]))`), "3:Test 4");
      });
      test("should process all values from an object", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(for @root.books val key (join [@val.id,":",@key]))`), "321:book4");
      });
      test("should process all values from a string", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(for "hello" char index (join [@index,":",@char]))`), "4:o");
      });
      test("should only include values that were returned", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(for @root.list val index (if (eq @index "2") (join [@index,":",@val.name])))`), "2:Test 3");
      });
    });
    describe("(for, inputValue, valuePath,  mapping)", () => {
      test("should process all values from an array", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(for @root.list val @val.name)`), "Test 4");
      });
      test("should process all values from an object", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(for @root.books val @val.id)`), "321");
      });
      test("should process all values from a string", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(for "hello" char @char)`), "o");
      });
      test("should only include values that were returned", async () => {
        assert.deepStrictEqual(await jsh.evalJsh(`(for @root.list val (if (eq @val.id "333") @val.name))`), "Test 3");
      });
    });
  });

  describe("size", () => {
    describe("(size, value)", () => {
      test("should return the correct size for a given string", async () => {
        assert.strictEqual(await jsh.evalJsh(`(size "this is a test")`), 14);
      });
      test("should return the 0 for an empty string", async () => {
        assert.strictEqual(await jsh.evalJsh(`(size "")`), 0);
      });
      test("should return the correct size for a given array", async () => {
        assert.strictEqual(await jsh.evalJsh(`(size [1,6,8])`), 3);
      });
      test("should return the 0 for an empty array", async () => {
        assert.strictEqual(await jsh.evalJsh(`(size [])`), 0);
      });
      test("should return the correct size for a given object", async () => {
        assert.strictEqual(await jsh.evalJsh(`(size {size:10})`), 1);
      });
      test("should return the 0 for an empty object", async () => {
        assert.strictEqual(await jsh.evalJsh(`(size {})`), 0);
      });
    });
  });

  describe("type", () => {
    describe("(type, value)", () => {
      test("should return the correct type for a number", async () => {
        assert.strictEqual(await jsh.evalJsh(`(type 123)`), "number");
      });
      test("should return the correct type for a boolean", async () => {
        assert.strictEqual(await jsh.evalJsh(`(type true)`), "boolean");
      });
      test("should return the correct type for a string", async () => {
        assert.strictEqual(await jsh.evalJsh(`(type "this is a test")`), "string");
      });
      test("should return the correct type for an empty string", async () => {
        assert.strictEqual(await jsh.evalJsh(`(type "")`), "string");
      });
      test("should return the correct type for a null", async () => {
        assert.strictEqual(await jsh.evalJsh(`(type null)`), "null");
      });
      test("should return the correct type for an array", async () => {
        assert.strictEqual(await jsh.evalJsh(`(type [4,6,"test"])`), "array");
      });
      test("should return the correct type for an empty array", async () => {
        assert.strictEqual(await jsh.evalJsh(`(type [])`), "array");
      });
      test("should return the correct type for an object", async () => {
        assert.strictEqual(await jsh.evalJsh(`(type {hello:"hi"})`), "object");
      });
      test("should return the correct type for an empty object", async () => {
        assert.strictEqual(await jsh.evalJsh(`(type {})`), "object");
      });
    });
  });
}); 