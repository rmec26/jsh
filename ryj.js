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

const templateFuncs = {
  "$get": {
    args: 1, fn: (args, baseObj) => {
      const path = processTemplate(args[0], baseObj);
      if (typeof path === "string") {
        return processPath(path.split("."), baseObj).obj;
      } else if (path instanceof Array) {
        return processPath(path.map(v => v.toString()), baseObj).obj;
      }
    }
  },
  "$run": {
    args: 0, fn: (args, baseObj) => {
      processTemplate(args, baseObj);
    }
  },
  "$local": {
    args: 2, fn: (args, baseObj) => {
      const id = args[0].toString();
      const value = processTemplate(args[1], baseObj);
      baseObj["@local"][id] = value;
    }
  },
  "$list": {
    args: 2, fn: (args, baseObj) => {
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
  "$object": {
    args: 2, fn: (args, baseObj) => {
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
  "$literal": {
    args: 1, fn: (args) => {
      return args[0];
    }
  },
  "$size": {
    args: 1, fn: (args, baseObj) => {
      let obj = processTemplate(args[0], baseObj);
      let type = typeof obj;
      if (obj instanceof Array || type === "string") {
        return obj.length;
      } else if (obj && type === "object") {
        return Object.keys(obj).length;
      }
    }
  },
  "$type": {
    args: 1, fn: (args, baseObj) => {
      let obj = processTemplate(args[0], baseObj);
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
        const path = processTemplate(args[0], baseObj);
        if (typeof path === "string") {
          processPath(path.split("."), baseObj);
          return true
        } else if (path instanceof Array) {
          processPath(path.map(v => v.toString()), baseObj);
          return true
        }
      } catch (_) { }
      return false
    }
  },
  "$merge": {
    args: 2, fn: (args, baseObj) => {
      const a = processTemplate(args[0], baseObj);
      const b = processTemplate(args[1], baseObj);
      const c = processTemplate(args[2], baseObj);
      return merge(a, b, !!c);
    }
  },
};

templateFuncs["$"] = templateFuncs["$get"];
templateFuncs["$obj"] = templateFuncs["$object"];
templateFuncs["$lit"] = templateFuncs["$literal"];


function runTemplateFunction(templateFnObj, baseObj) {
  try {
    let [fn, ...args] = templateFnObj;
    let pos = fn.indexOf(":");
    if (pos !== -1) {
      args.unshift(fn.slice(pos + 1));
      fn = fn.slice(0, pos);
    }
    if (templateFuncs[fn] && args.length >= templateFuncs[fn].args) {
      return templateFuncs[fn].fn(args, baseObj);
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
  let result = processTemplate(template, { "@": templateBase.obj, "@root": root, "@local": {} });
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

function startServer(jsonPath, port = "8080") {
  function save() {
    fs.writeFileSync(jsonPath, JSON.stringify(root));
  }
  root = JSON.parse(fs.readFileSync(jsonPath).toString());
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
  console.log(`Server start on port ${port} for file ${jsonPath}`);
}


/*
+-------------+
| System Init |
+-------------+
*/

let jsonPath = process.argv[2];
let port = process.argv[3];

startServer(jsonPath, port);
