//@ts-check
const http = require("http");
const url = require("url");
const fs = require("fs");

let system = { root: {} };

class BadCallError extends Error { };
class NoValueFoundError extends Error { };


function merge(a, b, isDeep = false) {
  /** @type {string} */
  let typeA = typeof a;
  /** @type {string} */
  let typeB = typeof b;

  if (typeA !== "object" || typeA !== typeB) {
    return b;
  }
  //They are both objects here

  if (a) {
    if (a instanceof Array) {
      typeA = "array";
    }
  } else {
    typeA = "null";
  }


  if (b) {
    if (b instanceof Array) {
      typeB = "array";
    }
  } else {
    typeB = "null";
  }

  if (typeA === "null" || typeA !== typeB) {
    return b;
  }
  //They are both object
  if (typeA === "object") {
    let res = {};
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    for (let k of keysA) {
      if (keysB.includes(k)) {
        if (isDeep) {
          res[k] = merge(a[k], b[k], true);
        } else {
          res[k] = b[k];
        }
      } else {
        res[k] = a[k];
      }
    }
    for (let k of keysB) {
      if (!keysA.includes(k)) {
        res[k] = b[k];
      }
    }
    return res;
  } else {//they are both arrays
    return a.concat(b);
  }
}

/**
 * 
 * @param {object|Array} obj 
 * @param {string} level 
 * @param {string} lastLevels 
 * @returns 
 */
function processLevel(obj, level, lastLevels) {
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
      if (!Number.isNaN(level)) {
        if (inverse) {
          result = obj.length - result;
          if (result < 0) {
            result = 0;
          }
        } else if (over) {
          result = obj.length + result - 1;
        }
        return result;
      }
    } else {
      return level;
    }
  }
  throw new BadCallError(`The value ${lastLevels} is not an object/array.`)
}

/**
 * 
 * @param {string[]} path 
 * @param {any} baseObj 
 * @returns 
 */
function processPath(path, baseObj) {
  let parent = null;
  let obj = baseObj;
  let level = null;
  let lastLevels = "";
  for (let p of path) {
    lastLevels += lastLevels ? `.${p}` : p;
    level = processLevel(obj, p, lastLevels);
    parent = obj;
    obj = obj[level];
    if (obj === undefined) {
      throw new NoValueFoundError(`The value ${lastLevels} doesn't exist.`)
    }
  }
  return { parent, obj, lastLevels, level };
}

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

function processVariableToList(input) {
  let levelList = [];
  let buffer = "";
  let pos = 0;
  while (pos < input.length) {
    let c = input[pos];
    pos++;
    if (c == ".") {
      levelList.push(buffer);
      buffer = "";
    } else if (c == "\\") {
      if (pos < input.length) {
        buffer += input[pos];
        pos++;
      }
    } else {
      buffer += c;
    }
  }
  //The fact that it can put the last buffer even if empty here is on purpose
  levelList.push(buffer);
  return levelList;
}

function processPathInput(path) {
  if (typeof path === "string") {
    return processVariableToList(path);
  } else if (path instanceof Array) {
    if (!path.length) {
      throw new BadCallError("Path cannot be an empty array.");
    }
    return path.map(v => v.toString());
  }
  throw new BadCallError("Path is not of the type string or array.");
}

function toBoolean(value) {
  if (value === undefined) {
    return;
  }
  if (typeof value === "object") {
    if (value) {
      if (value instanceof Array) {
        return !!value.length;
      } else {
        return !!Object.keys(value).length;
      }
    } else {
      return false;
    }
  } else {
    return !!value;
  }
}

function toString(value) {
  if (value === undefined) {
    return;
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  } else {
    return value.toString();
  }
}

function toNumber(value) {
  if (value === undefined) {
    return;
  }
  const type = typeof value;
  if (type === "object") {
    //This imitates the logic on the toBool
    if (value) {
      if (value instanceof Array) {
        return value.length ? 1 : 0;
      } else {
        return Object.keys(value).length ? 1 : 0;
      }
    } else {
      return 0;
    }
  } else if (type === "boolean") {
    return value ? 1 : 0;
  } else if (type === "string") {
    let res = Number(value);
    if (!Number.isNaN(res)) {
      return res;
    }
  } else {
    return value;
  }
}

function toInteger(value) {
  let res = Number(value);
  if (value !== undefined) {
    return Math.trunc(res);
  }
}

function isEqual(a, b) {
  const typeA = typeof a;
  const typeB = typeof a;

  if (typeA === "object" && typeB === "object") {
    if (a) {
      if (b) {
        const aIsArray = a instanceof Array;
        const bIsArray = b instanceof Array;
        if (aIsArray === bIsArray) {// they are the same type
          if (aIsArray) {//they are arrays
            if (a.length === b.length) {
              return a.every((v, i) => isEqual(v, b[i]));
            }
            return false;
          } else {//they are objects
            let keysA = Object.keys(a);
            let keysB = Object.keys(b);
            if (keysA.length === keysB.length) {
              return keysA.every(k => b[k] !== undefined && isEqual(a[k], b[k]));
            }
            return false;
          }
        } else {
          return false;
        }
      } else {//a is obj or array but b is null
        return false;
      }
    } else {//a is null here
      return !b
    }
  } else {
    return a === b;
  }
}

function iterateValue(args, baseObj, iterator, iteratorName = "Iterator") {
  let obj = runJsh(args[0], baseObj);
  if (typeof obj === "string") {
    obj = [...obj];
  }
  if (obj && typeof obj === "object") {
    let valueVarName = processPathInput(runJsh(args[1], baseObj));
    let res = [];
    if (args.length > 3) {
      let keyVarName = processPathInput(runJsh(args[2], baseObj));
      Object.entries(obj).forEach(([k, v]) => {
        setValue([keyVarName], baseObj, k);
        setValue([valueVarName], baseObj, v);
        const processed = runJsh(args[3], baseObj);
        if (processed !== undefined) {
          iterator(processed);
        }
      });
    } else {
      Object.values(obj).forEach(v => {
        setValue([valueVarName], baseObj, v)
        const processed = runJsh(args[2], baseObj);
        if (processed !== undefined) {
          iterator(processed);
        }
      });
    }
    return res;
  } else {
    throw new BadCallError(`${iteratorName} expects to receive an object or array to iterate.`);
  }
}

function typeOf(value) {
  /** @type {string} */
  let type = typeof value;
  if (type === "object") {
    if (value === null) {
      type = "null";
    } else if (value instanceof Array) {
      type = "array";
    }
  }
  return type;
}

const jshFuncs = {
  "get": [
    {
      args: ["path"],
      fn: (path, baseObj) => getValue(path, baseObj)
    }
  ],
  "set": [
    {
      args: ["path", "any"],
      fn: (path, value, baseObj) => setValue(path, baseObj, value)
    }
  ],
  "delete": [
    {
      args: ["path"],
      fn: (path, baseObj) => deleteValue(path, baseObj)
    }
  ],
  "run": {
    args: 0, fn: () => { }
  },
  "map": {
    args: 3, raw: true, fn: (args, baseObj) => {
      let res = [];
      iterateValue(args, baseObj, processed => {
        res.push(processed);
      }, "Map");
      return res;
    }
  },
  "kmap": {
    args: 3, raw: true, fn: (args, baseObj) => {
      let res = {};
      iterateValue(args, baseObj, processed => {
        if (processed.k !== undefined && processed.v !== undefined) {
          res[processed.k.toString()] = processed.v;
        }
      }, "KMap");
      return res;
    }
  },
  "for": {
    args: 3, raw: true, fn: (args, baseObj) => {
      let res;
      iterateValue(args, baseObj, processed => { res = processed }, "For");
      return res;
    }
  },
  "size": [
    {
      args: ["array"],
      fn: array => array.length
    },
    {
      args: ["string"],
      fn: str => str.length
    },
    {
      args: ["object"],
      fn: obj => Object.keys(obj).length
    },
  ],
  "type": [
    {
      args: ["any"],
      fn: a => typeOf(a)
    }
  ],
  "exists": [
    {
      args: ["path"],
      fn: (path, baseObj) => {
        try {
          getValue(path, baseObj);
          return true;
        } catch (_) { }
        return false
      }
    }
  ],
  "merge": {
    args: 2, fn: (args) => {
      return merge(args[0], args[1], !!args[2]);
    }
  },
  "jsh": [
    {
      args: ["string"],
      fn: (path, baseObj) => runJsh(parseJsh(path), baseObj)
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
      fn: (check, thenTemplate, elseTemplate, baseObj) => {
        return runJsh(toBoolean(check) ? thenTemplate : elseTemplate, baseObj);
      }
    },
    {
      args: ["any", "template"],
      fn: (check, thenTemplate, baseObj) => {
        if (toBoolean(check)) {
          return runJsh(thenTemplate, baseObj);
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
  "sum": {
    args: 1, fn: args => {
      if (args[0] instanceof Array) {
        return args[0].reduce((sum, v) => {
          if (typeof v === "number") {
            sum += v;
          }
          return sum;
        }, 0);
      }
    }
  },
  "slice": {
    args: 2, fn: args => {
      if ((args[0] instanceof Array || typeof args[0] === "string") && typeof args[1] === "number") {
        return args[0].slice(args[1], typeof args[2] === "number" ? args[2] : undefined);
      }
    }
  },
  "minimum": {
    args: 1, fn: args => {
      if (args[0] instanceof Array) {
        let aux = args[0].filter(v => typeof v === "number");
        if (aux.length) {
          return Math.min(...aux);
        }
      }
    }
  },
  "maximum": {
    args: 1, fn: args => {
      if (args[0] instanceof Array) {
        let aux = args[0].filter(v => typeof v === "number");
        if (aux.length) {
          return Math.max(...aux);
        }
      }
    }
  },
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

/**
 * 
 * @param {any[]} callArgs 
 * @param {{args:string[],rest:string,fn:Function}[]} jshFunction 
 */
function processCallInput(fnName, callArgs, jshFunction, baseObj) {
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
    let finalArgs = []
    for (let i = 0; i < callArgs.length; i++) {
      const type = i < args.length ? args[i] : rest;
      if (type === "template") {
        finalArgs.push(callArgs[i]);
      } else {
        if (processedValues[i] === undefined) {
          processedValues[i] = runJsh(callArgs[i], baseObj);
          //this is continue and not a imediate break of the processing because this value could be treated as a template for the next possible call
          if (processedValues[i] === undefined) {
            errors.push(generateCallError(fnName, args, rest, `Argument ${i} call didn't return a value.`))
            continue mainloop;
          }
        }
        let value = processedValues[i];
        if (type === "any") {
          finalArgs.push(value);
        } else if (type === "path") {
          try {
            finalArgs.push(processPathInput(value));
          } catch (e) {
            errors.push(generateCallError(fnName, args, rest, `Argument ${i} isn't a valid path: ${e.message}`))
            continue mainloop;
          }
        } else if (type === typeOf(value)) {
          finalArgs.push(value);
        } else {
          errors.push(generateCallError(fnName, args, rest, `Argument ${i} is ${typeOf(value)} instead of ${type}`))
          continue mainloop;
        }
      }
    }
    if (rest) {
      let restValues = finalArgs.splice(args.length, finalArgs.length - args.length);
      return fn(...finalArgs, restValues, baseObj);
    }
    return fn(...finalArgs, baseObj);
  }
  throwFinalCallError(fnName, errors);
}

function callJshFunction(callInput, baseObj) {
  let [fnJsh, ...args] = callInput;
  let fn = runJsh(fnJsh, baseObj);
  if (typeof fn !== "string") {
    throw new BadCallError("Function name in call isn't a string.")
  }
  if (!jshFuncs[fn]) {
    throw new BadCallError(`Function '${fn}' doesn't exist.`)
  }
  //uses the new function format
  if (jshFuncs[fn] instanceof Array) {
    return processCallInput(fn, args, jshFuncs[fn], baseObj);
  } else {
    if (!jshFuncs[fn].raw) {
      args = runJsh({ type: "list", input: args }, baseObj);
    }
    if (args.length >= jshFuncs[fn].args) {
      return jshFuncs[fn].fn(args, baseObj);
    } else {
      throw new BadCallError(`Not enough arguments for function '${fn}'`);
    }
  }
}

function runJsh(parsedJsh, baseObj) {
  if (parsedJsh && typeof parsedJsh === "object") {
    if (typeof parsedJsh.type === "string") {
      if (parsedJsh.input instanceof Array) {
        let { type, input } = parsedJsh;
        let res;
        switch (type) {
          case "base":
            input.forEach(v => {
              let processed = runJsh(v, baseObj);
              if (processed !== undefined) {
                res = processed;
              }
            });
            return res;
          case "get":
            return getValue(input, baseObj);
          case "list":
            res = [];
            input.forEach(v => {
              let processed = runJsh(v, baseObj);
              if (processed !== undefined) {
                res.push(processed);
              }
            });
            return res;
          case "obj":
            res = {};
            for (let i = 0; i < input.length; i += 2) {
              let k = runJsh(input[i], baseObj);
              //only tries to process the value if the key returns something
              if (k !== undefined) {
                let v = runJsh(input[i + 1], baseObj);
                if (v !== undefined) {
                  res[k] = v;
                }
              }
            }
            return res;
          case "call":
            return callJshFunction(input, baseObj);
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

function processJshAndGetValue(path, jshInput) {
  let inputBaseObj = processPath(path, system);
  let parsedJsh = parseJsh(jshInput)
  let result = runJsh(parsedJsh, { ...system, "": inputBaseObj.obj, "this": inputBaseObj.obj });
  return result === undefined ? null : result;
}

function getValue(path, baseObj) {
  return processPath(path, baseObj).obj;
}

function setValue(path, baseObj, value) {

  let finalPath = path.pop();

  const { obj, lastLevels } = processPath(path, baseObj);

  //TODO fix the last levels here
  finalPath = processLevel(obj, finalPath, lastLevels);
  if (obj instanceof Array && finalPath >= obj.length) {
    while (finalPath > obj.length) {
      obj.push(null);
    }
  }
  obj[finalPath] = value
}


function patchValue(path, baseObj, value, isDeep) {
  let { parent, obj, level } = processPath(path, baseObj);
  parent[level] = merge(obj, value, isDeep);
}

function deleteValue(path, baseObj) {
  const { parent, obj, level } = processPath(path, baseObj);

  if (parent instanceof Array) {
    parent.splice(level, 1);
  } else {
    delete parent[level];
  }

  return obj;
}

/*
+--------------+
| Server Start |
+--------------+
*/

const VALID_OPTIONS = {
  "GET": ["json", "text"],
  "POST": ["json", "text"],
  "PUT": ["json", "text"],
  "PATCH": ["json", "deep"],
  "DELETE": ["json", "text"],
}

function startServer(jsonPath = "-", port = "8080") {
  let save = () => { };

  if (jsonPath !== "-") {
    save = () => {
      fs.writeFileSync(jsonPath, JSON.stringify(system.root));
    }
    if (!fs.existsSync(jsonPath)) {
      save();
    }
    system.root = JSON.parse(fs.readFileSync(jsonPath).toString());
  }

  http.createServer(function (req, res) {
    //@ts-ignore
    let urlObj = url.parse(req.url, true);
    //@ts-ignore
    let path = urlObj.pathname.split("/").filter(Boolean);
    //@ts-ignore
    let query = { ...urlObj.query };
    let opc = query.opc ? query.opc.toLowerCase() : "json";
    console.log(`Request: ${req.method} ${req.url}`);
    console.log(`Path: ${path?.join(".")}`);
    path.unshift("root")
    let bodyData = '';
    req.on('data', function (chunk) {
      bodyData += chunk;
    });
    req.on('end', async function () {
      try {
        let body;
        let value;
        if (!VALID_OPTIONS[req.method] || !VALID_OPTIONS[req.method].includes(opc)) {
          throw new BadCallError(`Method '${req.method}' with option '${opc}' isn't valid`);
        }
        switch (req.method) {
          case "GET":
            value = getValue(path, system);
            switch (opc) {
              case "text":
                res.writeHead(200, { 'Content-Type': "text/plain" });
                res.write(typeof value === "string" ? value : JSON.stringify(value));
                break;
              case "json":
                res.writeHead(200, { 'Content-Type': "application/json" });
                res.write(JSON.stringify(value));
                break;
            }
            break;
          case "POST":
            console.log(`Body: ${bodyData}`);


            value = processJshAndGetValue(path, bodyData)
            switch (opc) {
              case "text":
                res.writeHead(200, { 'Content-Type': "text/plain" });
                res.write(typeof value === "string" ? value : JSON.stringify(value));
                break;
              case "json":
                res.writeHead(200, { 'Content-Type': "application/json" });
                res.write(JSON.stringify(value));
                break;
            }
            break;
          case "PUT":
            console.log(`Body: ${bodyData}`);
            switch (opc) {
              case "text":
                body = bodyData
                break;
              case "json":
                try {
                  body = JSON.parse(bodyData);
                } catch (e) {
                  throw new BadCallError(`Error procesing body: ${e.message}`);
                }
                break;
            }

            setValue(path, system, body);
            save()
            res.writeHead(200, { 'Content-Type': "application/json" });
            res.write(JSON.stringify({ message: "Updated" }));
            break;
          case "PATCH":
            console.log(`Body: ${bodyData}`);
            try {
              body = JSON.parse(bodyData);
            } catch (e) {
              throw new BadCallError(`Error procesing body: ${e.message}`);
            }
            switch (opc) {
              case "deep":
                patchValue(path, system, body, true);
                break;
              case "json":
                patchValue(path, system, body, false);
                break;
            }
            save()
            res.writeHead(200, { 'Content-Type': "application/json" });
            res.write(JSON.stringify({ message: "Patched" }));
            break;
          case "DELETE":
            value = deleteValue(path, system);
            save()
            switch (opc) {
              case "text":
                res.writeHead(200, { 'Content-Type': "text/plain" });
                res.write(typeof value === "string" ? value : JSON.stringify(value));
                break;
              case "json":
                res.writeHead(200, { 'Content-Type': "application/json" });
                res.write(JSON.stringify(value));
                break;
            }
            break;
        }
      } catch (e) {
        let errorStatus = 500;
        if (e instanceof BadCallError) {
          errorStatus = 400;
        } else if (e instanceof NoValueFoundError) {
          errorStatus = 404;
        }
        res.writeHead(errorStatus, { 'Content-Type': "application/json" });
        res.write(JSON.stringify({ error: e.message.split("\n") }));
      }
      res.end();
    });
  }).listen(port);
  console.log(`Server start on port ${port} ${jsonPath === "-" ? "running in memory" : `for file ${jsonPath}`}`);
}

let jsonPath = process.argv[2];
let port = process.argv[3];

startServer(jsonPath, port);


