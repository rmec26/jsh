//@ts-check

import { BadCallError, NoValueFoundError } from "./errors.mjs";
import { jshFuncs } from "./functions.mjs";
import { merge } from "./merge.mjs";
import { parseJsh } from "./parser.mjs";
import { processPathInput } from "./path.mjs";
import { checkTypeOf } from "./types.mjs";

function throwFinalCallError(fnName, errors) {
  throw new BadCallError(`Error on '${fnName}':\n  ${errors.join("\n  ")}`);
}

function generateArgsString(arg) {
  if (arg instanceof Array) {
    return `[${arg.map(a => generateArgsString(a)).join(", ")}]`
  } else {
    return arg
  }
}

function generateCallError(fnName, args, rest, error) {
  return `For (${[fnName, ...args.map(a => generateArgsString(a))].join(", ")}${rest ? `, ...${rest}` : ""}): ${error}`;
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


  _patchValue(path, value, depth) {
    let { parent, obj, level } = this._processPath(path);
    parent[level] = merge(obj, value, depth);
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

  patchValue(path, value, depth) {
    this._patchValue(processPathInput(path), value, depth);
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
