//@ts-check

import { JSH } from "./src/jsh.mjs"

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

function checkTypeOf(value, type) {
  type = type.trim().toLowerCase();
  if (type === "any") {
    return [value];
  }
  let baseType = typeOf(value);

  if (baseType === type) {
    return [value];
  }

  if (type.includes("(")) {
    let pos = type.indexOf("(");
    let mainType = type.slice(0, pos);
    let level = 0;
    let buffer = "";
    let innerTypes = [];
    pos++;
    let hasEnded = false;
    while (pos < type.length && !hasEnded) {
      let c = type[pos];
      pos++;
      if (level) {
        if (c === "(") {
          level++;
        } else if (c === ")") {
          level--;
        }
        buffer += c;
      } else {
        //has ended
        if (c === ")") {
          if (buffer) {
            innerTypes.push(buffer);
          }
          hasEnded = true;
          break
        } else if (c === " " || c === ",") {
          if (buffer) {
            innerTypes.push(buffer);
            buffer = "";
          }
        } else {
          buffer += c;
          if (c === "(") {
            level++;
          }
        }
      }
    }

    if (!hasEnded) {
      //invalid open type
    } else if (pos < type.length) {
      //has ended but has extra values after ending

    }

    if (mainType === "and") {
      for (const t of innerTypes) {
        let result = checkTypeOf(value, t);
        if (result.length > 1) {
          return result;
        }
      }
      return [value];
    }

    //process the type
  } else {
    if (type === "path") {
      try {
        return [JSH.processPathInput(value)]
      } catch (e) {
        return [null, e.message];
      }
    }

    if (type === "integer") {
      if (baseType === "number") {
        if (Math.trunc(value) === value) {
          return [value];
        }
        return [null, "Is a number but not an integer"];
      } else {
        return [null, `${baseType} is not a number`];
      }
    }

    if (type === "positive") {
      if (baseType === "number") {
        if (value > 0) {
          return [value];
        }
        return [null, "Is a number but not positive"];
      } else {
        return [null, `${baseType} is not a number`];
      }
    }

    if (type === "negative") {
      if (baseType === "number") {
        if (value < 0) {
          return [value];
        }
        return [null, "Is a number but not negative"];
      } else {
        return [null, `${baseType} is not a number`];
      }
    }

    if (type === "zero") {
      if (baseType === "number") {
        if (value === 0) {
          return [value];
        }
        return [null, "Is a number but not zero"];
      } else {
        return [null, `${baseType} is not a number`];
      }
    }
  }

  return [null, `${baseType} is not ${type}`];
}

function checkTypeOf(value, type) {

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
    let [mainType, ...innerTypes] = type;
    mainType = mainType.trim().toLowerCase();
    if (mainType === "and") {
      for (const t of innerTypes) {
        let result = checkTypeOf(value, t);
        if (result.length > 1) {
          return result;
        }
      }
      return [value];
    }

  } else {
    return [null, "Type must be a string or an array"]
  }
}

