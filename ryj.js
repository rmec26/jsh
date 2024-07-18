//@ts-check
const http = require("http");
const url = require("url");
const fs = require("fs");

let root = {};

class BadCallError extends Error { };
class NoValueFoundError extends Error { };


function merge(a, b, isDeep = false) {
  let typeA = typeof a;
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

function processPath(path, baseObj = root, lastLevels = "root") {
  let parent = null;
  let obj = baseObj;
  let level = null;
  for (let p of path) {
    level = processLevel(obj, p, lastLevels);
    lastLevels += `.${p}`;
    parent = obj;
    obj = obj[level];
    if (obj === undefined) {
      throw new NoValueFoundError(`The value ${lastLevels} doesn't exist.`)
    }
  }
  return { parent, obj, lastLevels, level };
}

function processQueryBuffer(state) {
  if (state.buffer) {
    try {
      state.curr.push(JSON.parse(state.buffer));
    } catch (e) {
      state.curr.push(state.buffer);
    }
    state.buffer = "";
    state.isReading = false;
  }
}

function parseQueryString(state, finalValue) {
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
  state.curr.push(buffer);
}

function parseQueryVariable(state) {
  let varList = [];
  //The @ here is because all values start with a @ on a template
  let buffer = "@";
  let isRunning = true;
  while (state.pos < state.input.length && isRunning) {
    let c = state.input[state.pos];
    state.pos++;
    let isWhitespace = c == " " || c == "\r" || c == "\t" || c == "\n";

    if (isWhitespace) {
      isRunning = false;
    } else if (c == ".") {
      varList.push(buffer);
      buffer = "";
    } else if (c == "(" || c == ")") {
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
  state.curr.push(["$get", varList])
}

function parseQuery(input) {
  let state = {
    input,
    pos: 0,
    buffer: "",
    isReading: false,
    stack: [],
    curr: [],
  }

  while (state.pos < state.input.length) {
    let c = state.input[state.pos];
    state.pos++;
    let isWhitespace = c == " " || c == "\r" || c == "\t" || c == "\n";
    if (state.isReading) {
      if (isWhitespace) {
        state.isReading = false;
        processQueryBuffer(state);
      } else if (c == "(") {
        processQueryBuffer(state);
        state.stack.push(state.curr);
        state.curr = [];
      } else if (c == ")") {
        processQueryBuffer(state);
        if (state.stack.length) {
          let aux = state.curr;
          state.curr = state.stack.pop();
          state.curr.push(aux);
        }
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
        if (c == "(") {
          state.stack.push(state.curr);
          state.curr = [];
        } else if (c == ")") {
          if (state.stack.length) {
            let aux = state.curr;
            state.curr = state.stack.pop();
            state.curr.push(aux);
          }
        } else if (c == "\\") {
          state.isReading = true;
          if (state.pos < state.input.length) {
            state.buffer += state.input[state.pos];
            state.pos++;
          }
        } else if (c == "\"" || c == "'") {
          parseQueryString(state, c);
        } else if (c == "@") {
          parseQueryVariable(state);
        } else {
          state.isReading = true;
          state.buffer += c;
        }
      }
    }
  }
  processQueryBuffer(state);

  //Automatically closes any open lists and adds them to the parent one
  while (state.stack.length) {
    let aux = state.curr;
    state.curr = state.stack.pop();
    state.curr.push(aux);
  }

  return state.curr
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

const templateFuncs = {
  "$get": {
    args: 1, fn: (args, baseObj) => {
      let path = args[0];
      if (typeof path === "string") {
        return processPath(path.split("."), baseObj).obj;
      } else if (path instanceof Array) {
        path = path.map(v => v.toString());
        return processPath(path.length ? path : ["@"], baseObj).obj;
      }
    }
  },
  "$run": {
    args: 0, fn: () => { }
  },
  "$local": {
    args: 2, fn: (args, baseObj) => {
      baseObj["@local"][args[0].toString()] = args[1];
    }
  },
  "$map": {
    args: 2, raw: true, fn: (args, baseObj) => {
      let obj = processTemplate(args[0], baseObj);
      if (obj && typeof obj === "object") {
        let res = [];
        Object.entries(obj).forEach(([k, v]) => {
          const processed = processTemplate(args[1], { ...baseObj, "@v": v, "@k": k })
          if (processed !== undefined) {
            res.push(processed);
          }
        });
        return res;
      }
    }
  },
  "$kmap": {
    args: 2, raw: true, fn: (args, baseObj) => {
      let obj = processTemplate(args[0], baseObj);
      if (obj && typeof obj === "object") {
        let res = {};
        Object.entries(obj).forEach(([k, v]) => {
          const processed = processTemplate(args[1], { ...baseObj, "@v": v, "@k": k })
          if (processed !== undefined && processed.k !== undefined && processed.v !== undefined) {
            res[processed.k.toString()] = processed.v;
          }
        });
        return res;
      }
    }
  },
  "$object": {
    args: 0, fn: (args) => {
      let result = {};
      for (let v of args) {
        if (v instanceof Array && v.length > 1) {
          result[v[0].toString()] = v[1];
        }
      }
      return result
    }
  },
  "$literal": {
    args: 1, raw: true, fn: args => args[0]
  },
  "$size": {
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
  "$type": {
    args: 1, fn: (args) => {
      let obj = args[0];
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
  "$exists": {
    args: 1, fn: (args, baseObj) => {
      try {
        let path = args[0];
        if (typeof path === "string") {
          processPath(path.split("."), baseObj);
          return true
        } else if (path instanceof Array) {
          path = path.map(v => v.toString());
          processPath(path.length ? path : ["@"], baseObj);
          return true
        }
      } catch (_) { }
      return false
    }
  },
  "$merge": {
    args: 2, fn: (args) => {
      return merge(args[0], args[1], !!args[2]);
    }
  },
  "$query": {
    args: 1, fn: (args, baseObj) => {
      if (typeof args[0] === "string") {
        let result = parseQuery(args[0]);
        //this makes a pop because the processQuery returns an array 
        return processTemplate(result, baseObj).pop();
      }
    }
  },
  "$parse": {
    args: 1, fn: (args) => {
      if (typeof args[0] === "string") {
        return parseQuery(args[0]);
      }
    }
  },
  "$exec": {
    args: 1, fn: (args, baseObj) => {
      if (args[0] instanceof Array) {
        return processTemplate(args[0], baseObj).pop();
      }
    }
  },
  "$add": {
    args: 2, fn: (args) => {
      if (typeof args[0] === "number" && typeof args[1] === "number") {
        return args[0] + args[1];
      }
    }
  },
  "$subtract": {
    args: 2, fn: (args) => {
      if (typeof args[0] === "number" && typeof args[1] === "number") {
        return args[0] - args[1];
      }
    }
  },
  "$multiply": {
    args: 2, fn: (args) => {
      if (typeof args[0] === "number" && typeof args[1] === "number") {
        return args[0] * args[1];
      }
    }
  },
  "$divide": {
    args: 2, fn: (args) => {
      if (typeof args[0] === "number" && typeof args[1] === "number") {
        return args[0] / args[1];
      }
    }
  },
  "$integerDivide": {
    args: 2, fn: (args) => {
      if (typeof args[0] === "number" && typeof args[1] === "number") {
        return Math.trunc(args[0] / args[1]);
      }
    }
  },
  "$modulo": {
    args: 2, fn: (args) => {
      if (typeof args[0] === "number" && typeof args[1] === "number") {
        return args[0] % args[1];
      }
    }
  },
  "$truncate": {
    args: 1, fn: (args) => {
      if (typeof args[0] === "number") {
        return Math.trunc(args[0]);
      }
    }
  },
  "$string": {
    args: 1, fn: args => toString(args[0])
  },
  "$boolean": {
    args: 1, fn: args => toBoolean(args[0])
  },
  "$number": {
    args: 1, fn: args => toNumber(args[0])
  },
  "$integer": {
    args: 1, fn: args => toInteger(args[0])
  },
  "$json": {
    args: 1, fn: (args) => {
      if (typeof args[0] === "string") {
        return JSON.parse(args[0]);
      }
    }
  },
  "$equals": {
    args: 2, fn: args => isEqual(args[0], args[1])
  },
  "$notEquals": {
    args: 2, fn: args => !isEqual(args[0], args[1])
  },
  "$greater": {
    args: 2, fn: args => {
      const typeA = typeof args[0];
      const typeB = typeof args[1];
      if (typeA === typeB && (typeA === "number" || typeA === "string")) {
        return args[0] > args[1];
      }
    }
  },
  "$less": {
    args: 2, fn: args => {
      const typeA = typeof args[0];
      const typeB = typeof args[1];
      if (typeA === typeB && (typeA === "number" || typeA === "string")) {
        return args[0] < args[1];
      }
    }
  },
  "$greaterEqual": {
    args: 2, fn: args => {
      const typeA = typeof args[0];
      const typeB = typeof args[1];
      if (typeA === typeB && (typeA === "number" || typeA === "string")) {
        return args[0] >= args[1];
      }
    }
  },
  "$lessEqual": {
    args: 2, fn: args => {
      const typeA = typeof args[0];
      const typeB = typeof args[1];
      if (typeA === typeB && (typeA === "number" || typeA === "string")) {
        return args[0] <= args[1];
      }
    }
  },
  "$if": {
    args: 2, raw: true, fn: (args, baseObj) => {
      let check = processTemplate(args[0], baseObj);
      if (check !== undefined) {
        if (toBoolean(check)) {
          return processTemplate(args[1], baseObj);
        } else if (args[2]) {
          return processTemplate(args[2], baseObj);
        }
      }
    }
  },
  "$join": {
    args: 1, fn: args => {
      if (args[0] instanceof Array) {
        let separator = args.length > 1 && typeof args[1] === "string" ? args[1] : "";
        return args[0].map(v => toString(v)).join(separator);
      }
    }
  },
  "$sum": {
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
  "$slice": {
    args: 2, fn: args => {
      if ((args[0] instanceof Array || typeof args[0] === "string") && typeof args[1] === "number") {
        return args[0].slice(args[1], typeof args[2] === "number" ? args[2] : undefined);
      }
    }
  },
  "$minimum": {
    args: 1, fn: args => {
      if (args[0] instanceof Array) {
        let aux = args[0].filter(v => typeof v === "number");
        if (aux.length) {
          return Math.min(...aux);
        }
      }
    }
  },
  "$maximum": {
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

templateFuncs["$"] = templateFuncs["$query"];
templateFuncs["$obj"] = templateFuncs["$object"];
templateFuncs["$lit"] = templateFuncs["$literal"];
templateFuncs["$+"] = templateFuncs["$add"];
templateFuncs["$sub"] = templateFuncs["$subtract"];
templateFuncs["$-"] = templateFuncs["$subtract"];
templateFuncs["$mul"] = templateFuncs["$multiply"];
templateFuncs["$*"] = templateFuncs["$multiply"];
templateFuncs["$div"] = templateFuncs["$divide"];
templateFuncs["$/"] = templateFuncs["$divide"];
templateFuncs["$idiv"] = templateFuncs["$integerDivide"];
templateFuncs["$//"] = templateFuncs["$integerDivide"];
templateFuncs["$mod"] = templateFuncs["$modulo"];
templateFuncs["$%"] = templateFuncs["$modulo"];
templateFuncs["$trunc"] = templateFuncs["$truncate"];
templateFuncs["$str"] = templateFuncs["$string"];
templateFuncs["$bool"] = templateFuncs["$boolean"];
templateFuncs["$num"] = templateFuncs["$number"];
templateFuncs["$int"] = templateFuncs["$integer"];
templateFuncs["$eq"] = templateFuncs["$equals"];
templateFuncs["$=="] = templateFuncs["$equals"];
templateFuncs["$ne"] = templateFuncs["$notEquals"];
templateFuncs["$!="] = templateFuncs["$notEquals"];
templateFuncs["$gt"] = templateFuncs["$greater"];
templateFuncs["$>"] = templateFuncs["$greater"];
templateFuncs["$lt"] = templateFuncs["$less"];
templateFuncs["$<"] = templateFuncs["$less"];
templateFuncs["$gte"] = templateFuncs["$greaterEqual"];
templateFuncs["$>="] = templateFuncs["$greaterEqual"];
templateFuncs["$lte"] = templateFuncs["$lessEqual"];
templateFuncs["$<="] = templateFuncs["$lessEqual"];
templateFuncs["$min"] = templateFuncs["$minimum"];
templateFuncs["$max"] = templateFuncs["$maximum"];


function runTemplateFunction(templateFnObj, baseObj) {
  try {
    let [fn, ...args] = templateFnObj;
    let pos = fn.indexOf(":");
    if (pos !== -1) {
      args.unshift(fn.slice(pos + 1));
      fn = fn.slice(0, pos);
    }
    if (templateFuncs[fn]) {
      if (!templateFuncs[fn].raw) {
        args = processTemplate(args, baseObj);
      }
      if (args.length >= templateFuncs[fn].args) {
        return templateFuncs[fn].fn(args, baseObj);
      }
    }
  } catch (e) { }
}

function isTemplateFunction(obj) {
  return (obj instanceof Array) && (typeof obj[0] === "string") && obj[0].startsWith("$");
}

function processTemplate(template, baseObj) {
  if (template && typeof template === "object") {
    if (template instanceof Array) {
      if (isTemplateFunction(template)) {
        return runTemplateFunction(template, baseObj);
      } else {
        let res = [];
        template.forEach(v => {
          let processed = processTemplate(v, baseObj);
          if (processed !== undefined) {
            res.push(processed);
          }
        });
        return res;
      }
    } else {
      let res = {}
      for (const [k, v] of Object.entries(template)) {
        const processed = processTemplate(v, baseObj);
        if (processed !== undefined) {
          res[k] = processed;
        }
      }
      return res
    }
  }
  //consider allowing to add values to strings
  return template
}

function getTemplateValue(path, template) {
  let templateBase = processPath(path);
  let result = processTemplate(template, { "@": templateBase.obj, "@post": templateBase.obj, "@root": root, "@local": {} });
  return result === undefined ? null : result;
}

function getValue(path) {
  return processPath(path).obj;
}

function setValue(path, value) {
  if (!path.length) {
    root = value;
  } else {
    let finalPath = path.pop();

    const { obj, lastLevels } = processPath(path);

    finalPath = processLevel(obj, finalPath, lastLevels);
    if (obj instanceof Array && finalPath >= obj.length) {
      while (finalPath > obj.length) {
        obj.push(null);
      }
    }
    obj[finalPath] = value
  }
}

function patchValue(path, value, isDeep) {
  let { parent, obj, level } = processPath(path);
  parent[level] = merge(obj, value, isDeep);
}

function deleteValue(path) {
  if (!path.length) {
    let oldRoot = root;
    root = null;
    return oldRoot
  }
  const { parent, obj, lastLevels, level } = processPath(path);

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
      fs.writeFileSync(jsonPath, JSON.stringify(root));
    }
    if (!fs.existsSync(jsonPath)) {
      save();
    }
    root = JSON.parse(fs.readFileSync(jsonPath).toString());
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
            value = getValue(path);
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
            try {
              body = JSON.parse(bodyData);
            } catch (e) {
              throw new BadCallError(`Error procesing body: ${e.message}`);
            }
            value = getTemplateValue(path, body)
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

            setValue(path, body);
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
                patchValue(path, body, true);
                break;
              case "json":
                patchValue(path, body, false);
                break;
            }
            save()
            res.writeHead(200, { 'Content-Type': "application/json" });
            res.write(JSON.stringify({ message: "Patched" }));
            break;
          case "DELETE":
            value = deleteValue(path);
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
