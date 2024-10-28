//@ts-check

import { processPathInput } from "./path.mjs";
import { toString } from "./converters.mjs";

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
        return [processPathInput(value)]
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
