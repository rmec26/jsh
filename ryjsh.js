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

//consider having a alternate version for functions outside the query
function parseVariableToList(input, pos = 0) {
  let varList = [];
  let buffer = "";
  let isRunning = true;
  while (pos < input.length && isRunning) {
    let c = input[pos];
    pos++;

    if (isWhitespaceChar(c)) {
      isRunning = false;
    } else if (c == ".") {
      varList.push(buffer);
      buffer = "";
    } else if (c == "(" || c == ")" || c == "[" || c == "]" || c == "{" || c == "}") {
      pos--;
      isRunning = false;
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
  varList.push(buffer);
  return { pos, varList };
}

function parseVariable(state) {
  let { pos, varList } = parseVariableToList(state.input, state.pos);
  state.pos = pos;
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
    } else {
      let isWhitespace = isWhitespaceChar(c);
      if (state.isReading) {
        if (isWhitespace) {
          state.isReading = false;
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

function parsePathInput(path) {
  //TODO consider converting this function to be only for processing string from the get
  if (typeof path === "string") {
    return parseVariableToList(path).varList;
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

const jshFuncs = {
  "get": {
    args: 1, fn: (args, baseObj) => {
      return getValue(parsePathInput(args[0]), baseObj)
    }
  },
  "set": {
    args: 2, fn: (args, baseObj) => {
      setValue(parsePathInput(args[0]), baseObj, args[1])
    }
  },
  "delete": {
    args: 1, fn: (args, baseObj) => {
      return deleteValue(parsePathInput(args[0]), baseObj)
    }
  },
  "run": {
    args: 0, fn: () => { }
  },
  "map": {
    args: 2, raw: true, fn: (args, baseObj) => {
      let obj = runJsh(args[0], baseObj);
      if (obj && typeof obj === "object") {
        let res = [];
        Object.entries(obj).forEach(([k, v]) => {
          const processed = runJsh(args[1], { ...baseObj, "v": v, "k": k })
          if (processed !== undefined) {
            res.push(processed);
          }
        });
        return res;
      }
    }
  },
  "kmap": {
    args: 2, raw: true, fn: (args, baseObj) => {
      let obj = runJsh(args[0], baseObj);
      if (obj && typeof obj === "object") {
        let res = {};
        Object.entries(obj).forEach(([k, v]) => {
          const processed = runJsh(args[1], { ...baseObj, "v": v, "k": k })
          if (processed !== undefined && processed.k !== undefined && processed.v !== undefined) {
            res[processed.k.toString()] = processed.v;
          }
        });
        return res;
      }
    }
  },
  "size": {
    args: 1, fn: (args) => {
      let obj = args[0];
      let type = typeof obj;
      if (obj instanceof Array || type === "string") {
        return obj.length;
      } else if (obj && type === "object") {
        return Object.keys(obj).length;
      }
    }
  },
  "type": {
    args: 1, fn: (args) => {
      let obj = args[0];
      /** @type {string} */
      let type = typeof obj;
      if (type === "object") {
        if (obj === null) {
          type = "null";
        } else if (obj instanceof Array) {
          type = "array";
        }
      }
      return type;
    }
  },
  "exists": {
    args: 1, fn: (args, baseObj) => {
      try {
        let path = args[0];
        getValue(parsePathInput(path), baseObj);
        return true;
      } catch (_) { }
      return false
    }
  },
  "merge": {
    args: 2, fn: (args) => {
      return merge(args[0], args[1], !!args[2]);
    }
  },
  "jsh": {
    args: 1, fn: (args, baseObj) => {
      if (typeof args[0] === "string") {
        let result = parseJsh(args[0]);
        return runJsh(result, baseObj);
      }
    }
  },
  "add": {
    args: 2, fn: (args) => {
      if (typeof args[0] === "number" && typeof args[1] === "number") {
        return args[0] + args[1];
      }
    }
  },
  "subtract": {
    args: 2, fn: (args) => {
      if (typeof args[0] === "number" && typeof args[1] === "number") {
        return args[0] - args[1];
      }
    }
  },
  "multiply": {
    args: 2, fn: (args) => {
      if (typeof args[0] === "number" && typeof args[1] === "number") {
        return args[0] * args[1];
      }
    }
  },
  "divide": {
    args: 2, fn: (args) => {
      if (typeof args[0] === "number" && typeof args[1] === "number") {
        return args[0] / args[1];
      }
    }
  },
  "integerDivide": {
    args: 2, fn: (args) => {
      if (typeof args[0] === "number" && typeof args[1] === "number") {
        return Math.trunc(args[0] / args[1]);
      }
    }
  },
  "modulo": {
    args: 2, fn: (args) => {
      if (typeof args[0] === "number" && typeof args[1] === "number") {
        return args[0] % args[1];
      }
    }
  },
  "truncate": {
    args: 1, fn: (args) => {
      if (typeof args[0] === "number") {
        return Math.trunc(args[0]);
      }
    }
  },
  "string": {
    args: 1, fn: args => toString(args[0])
  },
  "boolean": {
    args: 1, fn: args => toBoolean(args[0])
  },
  "number": {
    args: 1, fn: args => toNumber(args[0])
  },
  "integer": {
    args: 1, fn: args => toInteger(args[0])
  },
  "equals": {
    args: 2, fn: args => isEqual(args[0], args[1])
  },
  "notEquals": {
    args: 2, fn: args => !isEqual(args[0], args[1])
  },
  "greater": {
    args: 2, fn: args => {
      const typeA = typeof args[0];
      const typeB = typeof args[1];
      if (typeA === typeB && (typeA === "number" || typeA === "string")) {
        return args[0] > args[1];
      }
    }
  },
  "less": {
    args: 2, fn: args => {
      const typeA = typeof args[0];
      const typeB = typeof args[1];
      if (typeA === typeB && (typeA === "number" || typeA === "string")) {
        return args[0] < args[1];
      }
    }
  },
  "greaterEqual": {
    args: 2, fn: args => {
      const typeA = typeof args[0];
      const typeB = typeof args[1];
      if (typeA === typeB && (typeA === "number" || typeA === "string")) {
        return args[0] >= args[1];
      }
    }
  },
  "lessEqual": {
    args: 2, fn: args => {
      const typeA = typeof args[0];
      const typeB = typeof args[1];
      if (typeA === typeB && (typeA === "number" || typeA === "string")) {
        return args[0] <= args[1];
      }
    }
  },
  "if": {
    args: 2, raw: true, fn: (args, baseObj) => {
      let check = runJsh(args[0], baseObj);
      if (check !== undefined) {
        if (toBoolean(check)) {
          return runJsh(args[1], baseObj);
        } else if (args[2]) {
          return runJsh(args[2], baseObj);
        }
      }
    }
  },
  "join": {
    args: 1, fn: args => {
      if (args[0] instanceof Array) {
        let separator = args.length > 1 && typeof args[1] === "string" ? args[1] : "";
        return args[0].map(v => toString(v)).join(separator);
      }
    }
  },
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


function callJshFunction(callInput, baseObj) {
  let [fn, ...args] = callInput;
  if (typeof fn !== "string") {
    throw new BadCallError("Function name in call isn't a string.")
  }
  if (!jshFuncs[fn]) {
    throw new BadCallError(`Function '${fn}' doesn't exist.`)
  }
  if (!jshFuncs[fn].raw) {
    args = runJsh({ type: "list", input: args }, baseObj);
  }
  if (args.length >= jshFuncs[fn].args) {
    return jshFuncs[fn].fn(args, baseObj);
  }
  //TODO throw err if not enough args
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
        res.write(JSON.stringify({ error: e.message }));
      }
      res.end();
    });
  }).listen(port);
  console.log(`Server start on port ${port} ${jsonPath === "-" ? "running in memory" : `for file ${jsonPath}`}`);
}

let jsonPath = process.argv[2];
let port = process.argv[3];

startServer(jsonPath, port);


