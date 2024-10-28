//@ts-check
import { toString, toBoolean, toNumber, toInteger } from "./converters.mjs";
import { BadCallError } from "./errors.mjs";
import { merge } from "./merge.mjs";
import { checkTypeOf, typeOf } from "./types.mjs";
import { isEqual } from "./utils.mjs";

function generateIterator(iteratorStart, iteratorProcessor, iteratorEnd) {
  return [
    {
      args: [["or", "array", "object", "string"], "path", "path", "template"],
      argsName: ["inputValue", "valuePath", "keyPath", "mapping"],
      fn: async (obj, valuePath, keyPath, mapping, jsh) => {
        if (typeOf(obj) === "string") {
          obj = [...obj];
        }
        let state = iteratorStart();
        for (const [k, v] of Object.entries(obj)) {
          jsh.setValue(keyPath, k);
          jsh.setValue(valuePath, v);
          const processed = await jsh.runJsh(mapping);
          if (processed !== undefined) {
            iteratorProcessor(state, processed);
          }
        };
        return iteratorEnd(state);
      }
    },
    {
      args: [["or", "array", "object", "string"], "path", "template"],
      argsName: ["inputValue", "valuePath", "mapping"],
      fn: async (obj, valuePath, mapping, jsh) => {
        if (typeOf(obj) === "string") {
          obj = [...obj];
        }
        let state = iteratorStart();
        for (const v of Object.values(obj)) {
          jsh.setValue(valuePath, v);
          const processed = await jsh.runJsh(mapping);
          if (processed !== undefined) {
            iteratorProcessor(state, processed);
          }
        };
        return iteratorEnd(state);
      }
    }
  ]
}

export const jshFuncs = {
  "get": [
    {
      args: ["path"],
      argsName: ["getPath"],
      fn: (path, jsh) => jsh.getValue(path)
    }
  ],
  "set": [
    {
      args: ["path", "any"],
      argsName: ["setPath", "newValue"],
      fn: (path, value, jsh) => jsh.setValue(path, value)
    }
  ],
  "delete": [
    {
      args: ["path"],
      argsName: ["deletePath"],
      fn: (path, jsh) => jsh.deleteValue(path)
    }
  ],
  "run": [
    {
      args: [],
      rest: "template",
      argsName: ["input"],
      fn: async (code, jsh) => {
        for (const entry of code) {
          await jsh.runJsh(entry);
        }
      }
    }
  ],
  "runr": [
    {
      args: [],
      rest: "template",
      argsName: ["input"],
      fn: async (code, jsh) => {
        let last;
        for (const entry of code) {
          let aux = await jsh.runJsh(entry);
          if (aux !== undefined) {
            last = aux
          }
        }
        return last;
      }
    }
  ],
  "map": generateIterator(
    () => [],
    (res, processed) => {
      res.push(processed)
    },
    res => res
  ),
  "kmap": generateIterator(
    () => ({}),
    (res, processed) => {
      if (processed && processed.k !== undefined && processed.v !== undefined) {
        res[processed.k.toString()] = processed.v;
      }
    },
    res => res
  ),
  "for": generateIterator(
    () => ({}),
    (res, processed) => {
      res.value = processed;
    },
    res => res.value
  ),
  "size": [
    {
      args: [["or", "array", "string", "object"]],
      argsName: ["value"],
      fn: value => typeOf(value) === "object" ? Object.keys(value).length : value.length
    }
  ],
  "type": [
    {
      args: ["any"],
      argsName: ["value"],
      fn: a => typeOf(a)
    }
  ],
  "exists": [
    {
      args: ["path"],
      argsName: ["varPath"],
      fn: (path, jsh) => {
        try {
          jsh.getValue(path);
          return true;
        } catch (_) { }
        return false
      }
    }
  ],
  "merge": [
    {
      args: ["any", "any", ["integer", "positive", "zero"]],
      argsName: ["obj1", "obj2", "depth"],
      fn: (obj1, obj2, depth) => {
        return merge(obj1, obj2, depth);
      }
    },
    {
      args: ["any", "any"],
      argsName: ["obj1", "obj2"],
      fn: (obj1, obj2) => {
        return merge(obj1, obj2);
      }
    }
  ],
  "jsh": [
    {
      args: ["string"],
      fn: (input, jsh) => jsh.eval(input)
    }
  ],
  "add": [
    {
      args: ["number", "number"],
      fn: (a, b) => a + b
    }
  ],
  "subtract": [
    {
      args: ["number", "number"],
      fn: (a, b) => a - b
    }
  ],
  "multiply": [
    {
      args: ["number", "number"],
      fn: (a, b) => a * b
    }
  ],
  "divide": [
    {
      args: ["number", "number"],
      fn: (a, b) => a / b
    }
  ],
  "integerDivide": [
    {
      args: ["number", "number"],
      fn: (a, b) => Math.trunc(a / b)
    }
  ],
  "modulo": [
    {
      args: ["number", "number"],
      fn: (a, b) => a % b
    }
  ],
  "truncate": [
    {
      args: ["number"],
      fn: a => Math.trunc(a)
    }
  ],
  "string": [
    {
      args: ["any"],
      fn: a => toString(a)
    }
  ],
  "boolean": [
    {
      args: ["any"],
      fn: a => toBoolean(a)
    }
  ],
  "number": [
    {
      args: ["any"],
      fn: a => toNumber(a)
    }
  ],
  "integer": [
    {
      args: ["any"],
      fn: a => toInteger(a)
    }
  ],
  "equals": [
    {
      args: ["any", "any"],
      fn: (a, b) => isEqual(a, b)
    }
  ],
  "notEquals": [
    {
      args: ["any", "any"],
      fn: (a, b) => !isEqual(a, b)
    }
  ],
  "greater": [
    {
      args: ["number", "number"],
      fn: (a, b) => a > b
    },
    {
      args: ["string", "string"],
      fn: (a, b) => a > b
    }
  ],
  "less": [
    {
      args: ["number", "number"],
      fn: (a, b) => a < b
    },
    {
      args: ["string", "string"],
      fn: (a, b) => a < b
    }
  ],
  "greaterEqual": [
    {
      args: ["number", "number"],
      fn: (a, b) => a >= b
    },
    {
      args: ["string", "string"],
      fn: (a, b) => a >= b
    }
  ],
  "lessEqual": [
    {
      args: ["number", "number"],
      fn: (a, b) => a <= b
    },
    {
      args: ["string", "string"],
      fn: (a, b) => a <= b
    }
  ],
  "if": [
    {
      args: ["any", "template", "template"],
      fn: (check, thenTemplate, elseTemplate, jsh) => {
        return jsh.runJsh(toBoolean(check) ? thenTemplate : elseTemplate);
      }
    },
    {
      args: ["any", "template"],
      fn: (check, thenTemplate, jsh) => {
        if (toBoolean(check)) {
          return jsh.runJsh(thenTemplate);
        }
      }
    }
  ],
  "join": [
    {
      args: ["array", "string"],
      fn: (array, separator) => array.map(v => toString(v)).join(separator)
    },
    {
      args: ["array"],
      fn: array => array.map(v => toString(v)).join("")
    },
  ],
  "sum": [
    {
      args: [["array", "number"]],
      argsName: ["array"],
      fn: array => {
        return array.reduce((sum, v) => {
          sum += v;
          return sum;
        }, 0);
      }
    }
  ],
  "slice": [
    {
      args: [["or", "array", "string"], "integer", "integer"],
      argsName: ["value", "start", "end"],
      fn: (value, start, end) => {
        return value.slice(start, end);
      }
    },
    {
      args: [["or", "array", "string"], "integer"],
      argsName: ["value", "start"],
      fn: (value, start) => {
        return value.slice(start);
      }
    }
  ],
  //TODO consider allowing the type system to check if the array actually has some values
  // possible ways to implement
  // filledArray - array has to have some value
  // notEmpty - more generic type that checks if the given value is not empty, would work with arrays, objects, string. Would be combined with an 'and'
  // [size min max] - an extension of the notEmpty that allows you to set the expected size, it receives the min and max size or just the min, in this case it would be [size,1]
  "minimum": [
    {
      args: [["array", "number"]],
      argsName: ["array"],
      fn: array => {
        if (array.length) {
          return Math.min(...array);
        } else {
          throw new BadCallError("Empty array given")
        }
      }
    }
  ],
  "maximum": [
    {
      args: [["array", "number"]],
      argsName: ["array"],
      fn: array => {
        if (array.length) {
          return Math.max(...array);
        } else {
          throw new BadCallError("Empty array given")
        }
      }
    }
  ],
};

jshFuncs["del"] = jshFuncs["delete"];
jshFuncs["+"] = jshFuncs["add"];
jshFuncs["sub"] = jshFuncs["subtract"];
jshFuncs["-"] = jshFuncs["subtract"];
jshFuncs["mul"] = jshFuncs["multiply"];
jshFuncs["*"] = jshFuncs["multiply"];
jshFuncs["div"] = jshFuncs["divide"];
jshFuncs["/"] = jshFuncs["divide"];
jshFuncs["idiv"] = jshFuncs["integerDivide"];
jshFuncs["//"] = jshFuncs["integerDivide"];
jshFuncs["mod"] = jshFuncs["modulo"];
jshFuncs["%"] = jshFuncs["modulo"];
jshFuncs["trunc"] = jshFuncs["truncate"];
jshFuncs["str"] = jshFuncs["string"];
jshFuncs["bool"] = jshFuncs["boolean"];
jshFuncs["num"] = jshFuncs["number"];
jshFuncs["int"] = jshFuncs["integer"];
jshFuncs["eq"] = jshFuncs["equals"];
jshFuncs["=="] = jshFuncs["equals"];
jshFuncs["ne"] = jshFuncs["notEquals"];
jshFuncs["!="] = jshFuncs["notEquals"];
jshFuncs["gt"] = jshFuncs["greater"];
jshFuncs[">"] = jshFuncs["greater"];
jshFuncs["lt"] = jshFuncs["less"];
jshFuncs["<"] = jshFuncs["less"];
jshFuncs["gte"] = jshFuncs["greaterEqual"];
jshFuncs[">="] = jshFuncs["greaterEqual"];
jshFuncs["lte"] = jshFuncs["lessEqual"];
jshFuncs["<="] = jshFuncs["lessEqual"];
jshFuncs["min"] = jshFuncs["minimum"];
jshFuncs["max"] = jshFuncs["maximum"];

