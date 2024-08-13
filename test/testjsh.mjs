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
    test("should throw a BadCallError if the given path is not a valid string or array", () => {
      assert.throws(() => jsh.evalJsh(`(get 123)`), (err) => {
        assert(err instanceof BadCallError);
        assert.strictEqual(err.message, "Error on 'get':\n  For (get, path): Argument 0 isn't a valid path: Path is not of the type string or array.");
        return true;
      });
    });
  });
}); 