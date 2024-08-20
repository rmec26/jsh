//@ts-check
import * as http from "http"
import * as url from "url"
import * as fs from "fs"
import { JSH, BadCallError, NoValueFoundError } from "./jsh.mjs"

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
  let jsh = new JSH("RYJSH");

  function processJshAndGetValue(path, jshInput) {
    jsh.resetMemory("root")
    let inputBaseObj = jsh.getValue(path);
    jsh.setValue("", inputBaseObj);
    jsh.setValue("this", inputBaseObj);
    let result = jsh.evalJsh(jshInput);
    return result === undefined ? null : result;
  }

  let save = () => { };

  if (jsonPath !== "-") {
    save = () => {
      fs.writeFileSync(jsonPath, JSON.stringify(jsh.getValue("root")));
    }
    if (!fs.existsSync(jsonPath)) {
      save();
    }
    jsh.setValue("root", JSON.parse(fs.readFileSync(jsonPath).toString()));
  } else {
    jsh.setValue("root", {});
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
            value = jsh.getValue(path);
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

            jsh.setValue(path, body);
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
                jsh.patchValue(path, body, true);
                break;
              case "json":
                jsh.patchValue(path, body, false);
                break;
            }
            save()
            res.writeHead(200, { 'Content-Type': "application/json" });
            res.write(JSON.stringify({ message: "Patched" }));
            break;
          case "DELETE":
            value = jsh.deleteValue(path);
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
        console.log(e.stack);

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


