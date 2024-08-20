//@ts-check


export class BadCallError extends Error { };
export class NoValueFoundError extends Error { };

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

function generateIterator(iteratorStart, iteratorProcessor, iteratorEnd) {
  function iterateWithKeys(obj, valuePath, keyPath, mapping, jsh) {
    let state = iteratorStart();
    Object.entries(obj).forEach(([k, v]) => {
      jsh.setValue(keyPath, k);
      jsh.setValue(valuePath, v);
      const processed = jsh.runJsh(mapping);
      if (processed !== undefined) {
        iteratorProcessor(state, processed);
      }
    });
    return iteratorEnd(state);
  }

  function iterate(obj, valuePath, mapping, jsh) {
    let state = iteratorStart();
    Object.values(obj).forEach(v => {
      jsh.setValue(valuePath, v);
      const processed = jsh.runJsh(mapping);
      if (processed !== undefined) {
        iteratorProcessor(state, processed);
      }
    });
    return iteratorEnd(state);
  }

  return [
    {
      args: ["array", "path", "path", "template"],
      fn: (array, valuePath, keyPath, mapping, jsh) => iterateWithKeys(array, valuePath, keyPath, mapping, jsh)
    },
    {
      args: ["array", "path", "template"],
      fn: (array, valuePath, mapping, jsh) => iterate(array, valuePath, mapping, jsh)
    },
    {
      args: ["object", "path", "path", "template"],
      fn: (obj, valuePath, keyPath, mapping, jsh) => iterateWithKeys(obj, valuePath, keyPath, mapping, jsh)
    },
    {
      args: ["object", "path", "template"],
      fn: (obj, valuePath, mapping, jsh) => iterate(obj, valuePath, mapping, jsh)
    },
    {
      args: ["string", "path", "path", "template"],
      fn: (str, valuePath, keyPath, mapping, jsh) => iterateWithKeys([...str], valuePath, keyPath, mapping, jsh)
    },
    {
      args: ["string", "path", "template"],
      fn: (str, valuePath, mapping, jsh) => iterate([...str], valuePath, mapping, jsh)
    },
  ]

}

export function typeOf(value) {
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

export function checkTypeOf(value, type) {
  let valueType = typeOf(value);
  let typeType = typeOf(type);

  if (typeType === "string") {
    type = type.trim().toLowerCase();

    if (type === "any") {
      return [value];
    }

    if (valueType === type) {
      return [value];
    }

    if (type === "path") {
      try {
        return [JSH.processPathInput(value)]
      } catch (e) {
        return [null, e.message];
      }
    }

    if (type === "integer") {
      if (valueType === "number") {
        if (Math.trunc(value) === value) {
          return [value];
        }
        return [null, "Is a number but not an integer"];
      } else {
        return [null, `${valueType} is not a number`];
      }
    }

    if (type === "positive") {
      if (valueType === "number") {
        if (value > 0) {
          return [value];
        }
        return [null, "Is a number but not positive"];
      } else {
        return [null, `${valueType} is not a number`];
      }
    }

    if (type === "negative") {
      if (valueType === "number") {
        if (value < 0) {
          return [value];
        }
        return [null, "Is a number but not negative"];
      } else {
        return [null, `${valueType} is not a number`];
      }
    }

    if (type === "zero") {
      if (valueType === "number") {
        if (value === 0) {
          return [value];
        }
        return [null, "Is a number but not zero"];
      } else {
        return [null, `${valueType} is not a number`];
      }
    }

    return [null, `${valueType} is not ${type}`];
  } else if (typeType === "array") {
    if (type.length < 2) {
      return [null, `${JSON.stringify(type)} is not a valid array type`]
    }
    let [mainType, ...innerTypes] = type;
    mainType = mainType.trim().toLowerCase();
    if (mainType === "array") {
      if (valueType === "array") {
        for (const [k, v] of Object.entries(value)) {
          let result = checkTypeOf(v, innerTypes[0]);
          if (result.length > 1) {
            return [null, `Value ${k} is not of the type ${toString(innerTypes[0])}`];
          }
        }
        return [value];
      } else {
        return [null, `${valueType} is not an array`];
      }
    } else if (mainType === "object") {
      if (valueType === "object") {
        for (const [k, v] of Object.entries(value)) {
          let result = checkTypeOf(v, innerTypes[0]);
          if (result.length > 1) {
            return [null, `Value ${k} is not of the type ${toString(innerTypes[0])}`];
          }
        }
        return [value];
      } else {
        return [null, `${valueType} is not an object`];
      }
    } else if (mainType === "and") {
      for (const t of innerTypes) {
        let result = checkTypeOf(value, t);
        if (result.length > 1) {
          return result;
        }
      }
      return [value];
    } else if (mainType === "or") {
      for (const t of innerTypes) {
        let result = checkTypeOf(value, t);
        if (result.length === 1) {
          return result;
        }
      }
      return [null, `${valueType} is not any of the types ${innerTypes.map(t => toString(t)).join(", ")}`];
    } else {
      return [null, `${mainType} is not a valid main type for an array type`]
    }
  } else {
    return [null, "Type must be a string or an array"]
  }
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
      fn: (code, jsh) => {
        for (const entry of code) {
          jsh.runJsh(entry);
        }
      }
    }
  ],
  "runr": [
    {
      args: [],
      rest: "template",
      argsName: ["input"],
      fn: (code, jsh) => {
        let last;
        for (const entry of code) {
          let aux = jsh.runJsh(entry);
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
      if (processed.k !== undefined && processed.v !== undefined) {
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
      fn: (path, jsh) => {
        try {
          jsh.getValue(path);
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


export class JSH {

  constructor(system = "JSH", functions = jshFuncs) {
    this.system = system;
    this.memory = { system };
    this.functions = functions;
  }

  static processVariableToList(input) {
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

  static processPathInput(path) {
    if (typeof path === "string") {
      return this.processVariableToList(path);
    } else if (path instanceof Array) {
      if (!path.length) {
        throw new BadCallError("Path cannot be an empty array.");
      }
      return path.map(v => v.toString());
    }
    throw new BadCallError("Path is not of the type string or array.");
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
    return this._getValue(JSH.processPathInput(path));
  }

  setValue(path, value,) {
    this._setValue(JSH.processPathInput(path), value);
  }

  patchValue(path, value, isDeep) {
    this._patchValue(JSH.processPathInput(path), value, isDeep);
  }

  deleteValue(path) {
    return this._deleteValue(JSH.processPathInput(path));
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
   */
  processCallInput(fnName, callArgs, jshFunction) {
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
            processedValues[i] = this.runJsh(callArgs[i]);
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
              finalArgs.push(JSH.processPathInput(value));
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
        return fn(...finalArgs, restValues, this);
      }
      return fn(...finalArgs, this);
    }
    throwFinalCallError(fnName, errors);
  }

  callJshFunction(callInput) {
    let [fnJsh, ...args] = callInput;
    let fn = this.runJsh(fnJsh);
    if (typeof fn !== "string") {
      throw new BadCallError("Function name in call isn't a string.")
    }
    if (!jshFuncs[fn]) {
      throw new BadCallError(`Function '${fn}' doesn't exist.`)
    }
    //uses the new function format
    if (jshFuncs[fn] instanceof Array) {
      return this.processCallInput(fn, args, jshFuncs[fn]);
    } else {
      if (!jshFuncs[fn].raw) {
        args = this.runJsh({ type: "list", input: args });
      }
      if (args.length >= jshFuncs[fn].args) {
        return jshFuncs[fn].fn(args, this);
      } else {
        throw new BadCallError(`Not enough arguments for function '${fn}'`);
      }
    }
  }

  runJsh(parsedJsh) {
    if (parsedJsh && typeof parsedJsh === "object") {
      if (typeof parsedJsh.type === "string") {
        if (parsedJsh.input instanceof Array) {
          let { type, input } = parsedJsh;
          let res;
          switch (type) {
            case "base":
              input.forEach(v => {
                let processed = this.runJsh(v);
                if (processed !== undefined) {
                  res = processed;
                }
              });
              return res;
            case "get":
              return this._getValue(input);
            case "list":
              res = [];
              input.forEach(v => {
                let processed = this.runJsh(v);
                if (processed !== undefined) {
                  res.push(processed);
                }
              });
              return res;
            case "obj":
              res = {};
              for (let i = 0; i < input.length; i += 2) {
                let k = this.runJsh(input[i]);
                //only tries to process the value if the key returns something
                if (k !== undefined) {
                  let v = this.runJsh(input[i + 1]);
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

  evalJsh(input) {
    return this.runJsh(parseJsh(input))
  }
}


