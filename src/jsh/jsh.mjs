//@ts-check

import { toString, toBoolean, toNumber, toInteger } from "./converters.mjs";
import { merge } from "./merge.mjs";
import { processPathInput } from "./path.mjs";
import { checkTypeOf, typeOf } from "./types.mjs";
import { isEqual } from "./utils.mjs";

export class BadCallError extends Error { };
export class NoValueFoundError extends Error { };

function processParserBuffer(state) {
  if (state.buffer) {
    let possibleNum = Number(state.buffer);
    if (Number.isNaN(possibleNum)) {
      switch (state.buffer) {
        case "true":
          state.curr.input.push(true);
          break;
        case "false":
          state.curr.input.push(false);
          break;
        case "null":
          state.curr.input.push(null);
          break;
        default:
          state.curr.input.push(state.buffer);
          break;
      }
    } else {
      state.curr.input.push(possibleNum);
    }
    state.buffer = "";
    state.isReading = false;
  }
}

function parseString(state, finalValue) {
  let buffer = "";
  let isRunning = true;
  while (state.pos < state.input.length && isRunning) {
    let c = state.input[state.pos];
    state.pos++;

    if (c == finalValue) {
      isRunning = false;
    } else if (c == "\\") {
      if (state.pos < state.input.length) {
        switch (state.input[state.pos]) {
          case "r":
            buffer += "\r";
            break;
          case "n":
            buffer += "\n";
            break;
          case "t":
            buffer += "\t";
            break;
          default:
            buffer += state.input[state.pos];
            break;
        }
        state.pos++;
      }
    } else {
      buffer += c;
    }
  }

  //If it gets to the end of the input it simply adds whatever is in the buffer
  //TODO consider making this throw an error instead
  state.curr.input.push(buffer);
}

function isWhitespaceChar(c) {
  return c == " " || c == "\r" || c == "\t" || c == "\n" || c == "," || c == ";" || c == ":";
}

function parseVariable(state) {
  let varList = [];
  let buffer = "";
  let isRunning = true;
  while (state.pos < state.input.length && isRunning) {
    let c = state.input[state.pos];
    state.pos++;

    if (isWhitespaceChar(c)) {
      isRunning = false;
    } else if (c == ".") {
      varList.push(buffer);
      buffer = "";
    } else if (c === "(" || c === ")" || c === "[" || c === "]" || c === "{" || c === "}" || c === "#") {
      state.pos--;
      isRunning = false;
    } else if (c == "\\") {
      if (state.pos < state.input.length) {
        buffer += state.input[state.pos];
        state.pos++;
      }
    } else {
      buffer += c;
    }
  }
  //The fact that it can put the last buffer even if empty here is on purpose
  varList.push(buffer);
  state.curr.input.push({ type: "get", input: varList })
}

function startScope(state, type) {
  processParserBuffer(state);
  state.stack.push(state.curr);
  state.curr = { type, input: [] };
}

function endScope(state, type) {
  processParserBuffer(state);
  if (state.curr.type !== type) {
    throw new BadCallError(`Attempting to close '${state.curr.type}' scope with '${type}' end char.`);
  }
  let endScope = state.curr;
  state.curr = state.stack.pop();
  state.curr.input.push(endScope);
}

function processComment(state) {
  while (state.pos < state.input.length) {
    let c = state.input[state.pos];
    state.pos++;
    if (c == '\n') {
      break;
    }
  }
}

function parseJsh(input) {
  let state = {
    input,
    pos: 0,
    buffer: "",
    isReading: false,
    stack: [],
    curr: { type: "base", input: [] },
  }

  while (state.pos < state.input.length) {
    let c = state.input[state.pos];
    state.pos++;

    if (c == "(") {
      startScope(state, "call");
    } else if (c == ")") {
      endScope(state, "call");
    } else if (c == "[") {
      startScope(state, "list");
    } else if (c == "]") {
      endScope(state, "list");
    } else if (c == "{") {
      startScope(state, "obj");
    } else if (c == "}") {
      endScope(state, "obj");
    } else if (c == "#") {
      processComment(state);
    } else {
      let isWhitespace = isWhitespaceChar(c);
      if (state.isReading) {
        if (isWhitespace) {
          processParserBuffer(state);
        } else if (c == "\\") {
          if (state.pos < state.input.length) {
            state.buffer += state.input[state.pos];
            state.pos++;
          }
        } else {
          state.buffer += c;
        }
      } else {
        if (!isWhitespace) {
          if (c == "\\") {
            state.isReading = true;
            if (state.pos < state.input.length) {
              state.buffer += state.input[state.pos];
              state.pos++;
            }
          } else if (c == "\"" || c == "'") {
            parseString(state, c);
          } else if (c == "@") {
            parseVariable(state);
          } else {
            state.isReading = true;
            state.buffer += c;
          }
        }
      }
    }
  }
  processParserBuffer(state);

  if (state.stack.length) {
    throw new BadCallError(`Open scopes found.`);
  }

  return state.curr;
}


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

const jshFuncs = {
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
      args: ["any", "any", "boolean"],
      argsName: ["obj1", "obj2", "isDeep"],
      fn: (obj1, obj2, isDeep) => {
        return merge(obj1, obj2, isDeep);
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
  // [size min max] - and extension of the notEmpty that allows you to set the expected size, it receives the min and max size or just the min, in this case it would be [size,1]
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


function throwFinalCallError(fnName, errors) {
  throw new BadCallError(`Error on '${fnName}':\n  ${errors.join("\n  ")}`);
}

function generateCallError(fnName, args, rest, error) {
  return `For (${[fnName, ...args].join(", ")}${rest ? `, ...${rest}` : ""}): ${error}`;
}


export class JSH {
  constructor(system = "JSH", functions = {}) {
    this.system = system;
    this.memory = { system };
    this.functions = { ...jshFuncs };

    let toCopy = [];
    let toDelete = [];
    let toSet = [];
    for (let [k, v] of Object.entries(functions)) {
      if (v === null) {
        toDelete.push(k);
      } else if (typeof v === "string") {
        toCopy.push([k, v]);
      } else {
        toSet.push([k, v]);
      }
    }
    for (let [newFn, currFn] of toCopy) {
      this.functions[newFn] = this.functions[currFn];
    }
    for (let fn of toDelete) {
      delete this.functions[fn];
    }
    for (let [fnName, fn] of toSet) {
      this.functions[fnName] = structuredClone(fn);
    }
  }

  /**
   * 
   * @param {object|Array} obj 
   * @param {string} level 
   * @param {string} lastLevels 
   * @returns 
   */
  static processLevel(obj, level, lastLevels) {
    if (obj && typeof obj === "object") {
      if (obj instanceof Array) {
        let inverse = false;
        let over = false;
        if (level.startsWith("-")) {
          inverse = true
          level = level.slice(1);
        } else if (level.startsWith("+")) {
          over = true
          level = level.slice(1);
        }
        let result = Number.parseInt(level);
        if (Number.isNaN(result)) {
          throw new BadCallError(`The level '${level}' is not valid for the array '${lastLevels}'.`)
        }
        if (inverse) {
          result = obj.length - result;
          if (result < 0) {
            result = 0;
          }
        } else if (over) {
          result = obj.length + result - 1;
        }
        return result;

      } else {
        return level;
      }
    }
    throw new BadCallError(`The value '${lastLevels}' is not an object/array.`)
  }

  /**
   * 
   * @param {string[]} path
   * @returns 
   */
  _processPath(path) {
    let parent = null;
    let obj = this.memory;
    let level = null;
    let lastLevels = "";
    for (let p of path) {
      lastLevels += lastLevels ? `.${p}` : p;
      level = JSH.processLevel(obj, p, lastLevels);
      parent = obj;
      obj = obj[level];
      if (obj === undefined) {
        throw new NoValueFoundError(`The value ${lastLevels} doesn't exist.`)
      }
    }
    return { parent, obj, lastLevels, level };
  }

  _getValue(path) {
    return this._processPath(path).obj;
  }

  _setValue(path, value) {
    let finalPath = path.pop();

    const { obj, lastLevels } = this._processPath(path);

    finalPath = JSH.processLevel(obj, finalPath, lastLevels);
    if (obj instanceof Array && finalPath >= obj.length) {
      while (finalPath > obj.length) {
        obj.push(null);
      }
    }
    obj[finalPath] = value
  }


  _patchValue(path, value, isDeep) {
    let { parent, obj, level } = this._processPath(path);
    parent[level] = merge(obj, value, isDeep);
  }

  _deleteValue(path) {
    const { parent, obj, level } = this._processPath(path);

    if (parent instanceof Array) {
      parent.splice(level, 1);
    } else {
      delete parent[level];
    }

    return obj;
  }

  getValue(path) {
    return this._getValue(processPathInput(path));
  }

  setValue(path, value,) {
    this._setValue(processPathInput(path), value);
  }

  patchValue(path, value, isDeep) {
    this._patchValue(processPathInput(path), value, isDeep);
  }

  deleteValue(path) {
    return this._deleteValue(processPathInput(path));
  }

  resetMemory(...valuesToKeep) {
    for (let k of Object.keys(this.memory)) {
      if (!valuesToKeep.includes(k)) {
        delete this.memory[k];
      }
    }
    this.memory.system = this.system;
  }

  /**
   * 
   * @param {any[]} callArgs 
   * @param {{args:string[],rest:string,fn:Function}[]} jshFunction 
   * @returns {Promise<any>}
   */
  async processCallInput(fnName, callArgs, jshFunction) {
    let errors = []
    let processedValues = {};
    mainloop:
    for (const { args, rest, fn } of jshFunction) {
      if (rest) {
        if (callArgs.length < args.length) {
          errors.push(generateCallError(fnName, args, rest, `Expected ${args.length}+ arguments, received ${callArgs.length}`))
          continue mainloop;
        }
      } else {
        if (callArgs.length !== args.length) {
          errors.push(generateCallError(fnName, args, rest, `Expected ${args.length} arguments, received ${callArgs.length}`))
          continue mainloop;
        }
      }
      let finalArgs = [];
      for (let i = 0; i < callArgs.length; i++) {
        const type = i < args.length ? args[i] : rest;
        if (type === "template") {
          finalArgs.push(callArgs[i]);
        } else {
          if (processedValues[i] === undefined) {
            processedValues[i] = await this.runJsh(callArgs[i]);
            //this is continue and not a imediate break of the processing because this value could be treated as a template for the next possible call
            if (processedValues[i] === undefined) {
              errors.push(generateCallError(fnName, args, rest, `Argument ${i} call didn't return a value.`))
              continue mainloop;
            }
          }
          let value = processedValues[i];
          let [finalValue, typeError] = checkTypeOf(value, type);
          if (typeError) {
            errors.push(generateCallError(fnName, args, rest, `Argument ${i} is invalid: ${typeError}`))
            continue mainloop;
          } else {
            finalArgs.push(finalValue);
          }
        }
      }
      if (rest) {
        let restValues = finalArgs.splice(args.length, finalArgs.length - args.length);
        return fn(...finalArgs, restValues, this);
      }
      return fn(...finalArgs, this);
    }
    throwFinalCallError(fnName, errors);
  }

  /**
   * 
   * @param {*} callInput 
   * @returns {Promise<any>}
   */
  async callJshFunction(callInput) {
    let [fnJsh, ...args] = callInput;
    let fn = await this.runJsh(fnJsh);
    if (typeof fn !== "string") {
      throw new BadCallError("Function name in call isn't a string.")
    }
    if (!jshFuncs[fn]) {
      throw new BadCallError(`Function '${fn}' doesn't exist.`)
    }
    return this.processCallInput(fn, args, jshFuncs[fn]);
  }

  /**
   * 
   * @param {*} parsedJsh 
   * @returns {Promise<any>}
   */
  async runJsh(parsedJsh) {
    if (parsedJsh && typeof parsedJsh === "object") {
      if (typeof parsedJsh.type === "string") {
        if (parsedJsh.input instanceof Array) {
          let { type, input } = parsedJsh;
          let res;
          switch (type) {
            case "base":
              for (const v of input) {
                let processed = await this.runJsh(v);
                if (processed !== undefined) {
                  res = processed;
                }
              };
              return res;
            case "get":
              return this._getValue(input);
            case "list":
              res = [];
              for (const v of input) {
                let processed = await this.runJsh(v);
                if (processed !== undefined) {
                  res.push(processed);
                }
              };
              return res;
            case "obj":
              res = {};
              for (let i = 0; i < input.length; i += 2) {
                let k = await this.runJsh(input[i]);
                //only tries to process the value if the key returns something
                if (k !== undefined) {
                  let v = await this.runJsh(input[i + 1]);
                  if (v !== undefined) {
                    res[k] = v;
                  }
                }
              }
              return res;
            case "call":
              return this.callJshFunction(input);
            default:
              throw new BadCallError(`Invalid JSH command type '${type}' given`);
          }
        } else {
          throw new BadCallError("JSH command input is not an array");
        }
      } else {
        throw new BadCallError("JSH command type is not a string");
      }
    }
    return parsedJsh
  }
  /**
   * 
   * @param {*} input 
   * @returns {Promise<any>}
   */
  evalJsh(input) {
    return this.runJsh(parseJsh(input))
  }
}
