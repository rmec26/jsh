//@ts-check
const http = require("http");
const url = require("url");
const fs = require("fs");

let root = {};

class BadCallError extends Error { };
class NoValueFoundError extends Error { };

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

function processTemplate(template, baseObj, lastLevels) {
  if (template && typeof template === "object") {
    if (template instanceof Array) {
      return template.forEach(v => processTemplate(v, baseObj, lastLevels));
    } else {
      if (template.$ !== undefined) {
        if (typeof template.$ === "string") {
          return processPath(template.$.split(".").filter(Boolean), baseObj, lastLevels).obj;
        } else if (template.$ instanceof Array) {
          return processPath(template.$, baseObj, lastLevels).obj;
        }
      } else {
        let res = {}
        for (const [k, v] of Object.entries(template)) {
          res[k] = processTemplate(v, baseObj, lastLevels)
        }
        return res
      }
    }
  }
  return template
}

function getTemplateValue(path, template, baseObj, lastLevels) {
  let templateBase = processPath(path, baseObj, lastLevels).obj;

  return processTemplate(template, templateBase)
}

function getValueVerbose(path) {
  let { obj } = processPath(path);
  let result = { value: obj, type: typeof obj };

  if (result.type === "object") {
    if (obj === null) {
      result.type = "null";
    } else if (obj instanceof Array) {
      result.type = "array";
    }
  }
  if (result.type === "string" || result.type === "array") {
    result.size = obj.length;
  } else if (result.type === "object") {
    result.keys = Object.keys(obj);
    result.values = Object.values(obj);
    result.size = result.keys.length;
  }
  return result;
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
  "GET": ["json", "text", "keys", "values", "entries", "type", "size", "verbose"],
  "POST": ["json"],
  "PUT": ["json", "text"],
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
    let path = urlObj.pathname.split("/");
    path?.shift();
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
            value = getValueVerbose(path);
            switch (opc) {
              case "text":
                res.writeHead(200, { 'Content-Type': "text/plain" });
                res.write(value.type === "string" ? value.value : JSON.stringify(value.value));
                break;
              case "type":
                res.writeHead(200, { 'Content-Type': "application/json" });
                res.write(JSON.stringify({ type: value.type }));
                break;
              case "size":
                if (value.size === undefined) {
                  throw new BadCallError(`Value '${path.join(".")}' doesn't have a size.`);
                }
                res.writeHead(200, { 'Content-Type': "application/json" });
                res.write(JSON.stringify({ size: value.size }));
                break;
              case "keys":
                if (value.size === undefined) {
                  throw new BadCallError(`Value '${path.join(".")}' doesn't have keys.`);
                }
                res.writeHead(200, { 'Content-Type': "application/json" });
                res.write(JSON.stringify({ keys: value.keys }));
                break;
              case "values":
                if (value.size === undefined) {
                  throw new BadCallError(`Value '${path.join(".")}' doesn't have values.`);
                }
                res.writeHead(200, { 'Content-Type': "application/json" });
                res.write(JSON.stringify({ values: value.values }));
                break;
              case "entries":
                if (value.keys === undefined) {
                  throw new BadCallError(`Value '${path.join(".")}' doesn't have entries.`);
                }
                res.writeHead(200, { 'Content-Type': "application/json" });
                res.write(JSON.stringify({ entries: Object.entries(value.value) }));
                break;
              case "verbose":
                res.writeHead(200, { 'Content-Type': "application/json" });
                res.write(JSON.stringify(value));
                break;
              case "json":
                res.writeHead(200, { 'Content-Type': "application/json" });
                res.write(JSON.stringify(value.value));
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
            res.writeHead(200, { 'Content-Type': "application/json" });
            res.write(JSON.stringify(getTemplateValue(path, body)));
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
