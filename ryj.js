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

function parseVariableToList(input, pos = 0) {
  let varList = [];
  let buffer = "";
  let isRunning = true;
  while (pos < input.length && isRunning) {
    let c = input[pos];
    pos++;
    let isWhitespace = c == " " || c == "\r" || c == "\t" || c == "\n";

    if (isWhitespace) {
      isRunning = false;
    } else if (c == ".") {
      varList.push(buffer);
      buffer = "";
    } else if (c == "(" || c == ")") {
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

function processTemplateValue(valuePath, baseObj) {
  if(valuePath.startsWith("@@")){
    return valuePath.slice(1);
  }
  return getValue(parseVariableToList(valuePath.slice(1)).varList, baseObj)

}

function isValueGet(obj) {
  return typeof obj === "string" && obj.startsWith("@");
}

function isValuesJoin(obj) {
  return (obj instanceof Array) && obj[0] === "@";
}

function processTemplate(template, baseObj) {
  if (isValueGet(template)) {
    return processTemplateValue(template, baseObj);
  } else if (isValuesJoin(template)) {
    let res = [];
    template.slice(1).forEach(v => {
      let processed = processTemplate(v, baseObj);
      if (processed !== undefined) {
        if (typeof processed === "object") {
          res.push(JSON.stringify(processed));
        } else {
          res.push(processed.toString());
        }
      }
    });
    return res.join("");
  } else if (template && typeof template === "object") {
    if (template instanceof Array) {
      let res = [];
      template.forEach(v => {
        let processed = processTemplate(v, baseObj);
        if (processed !== undefined) {
          res.push(processed);
        }
      });
      return res;
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
  let templateBase = processPath(path, system);
  let result = processTemplate(template, { ...system, "": templateBase.obj, "post": templateBase.obj, "this": templateBase.obj });
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
