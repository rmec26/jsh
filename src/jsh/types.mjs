//@ts-check

import { processPathInput } from "./path.mjs";
import { toString } from "./converters.mjs";

const simpleTypes = ["string", "number", "boolean", "null", "array", "object"];

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
  let typeFormat = typeOf(type);

  if (typeFormat === "string") {
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


    return [null, simpleTypes.includes(type) ? `${valueType} value is not of ${type} type` : `'${type}' is not a valid simple type`];
  } else if (typeFormat === "array") {
    if (type.length < 2) {
      return [null, `Complex types must have inner types`]
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
    } else if (mainType === "number" || mainType === "integer") {
      if (valueType === "number") {
        if (mainType === "integer" && Math.trunc(value) !== value) {
          return [null, "Is a number but not an integer"];
        }

        let isPositive = false;
        let isNegative = false;
        let isZero = false;

        for (let t of innerTypes) {
          t = t.trim().toLowerCase();
          if (t === "positive" || t === "pos") {
            isPositive = true;
          } else if (t === "negative" || t === "neg") {
            isNegative = true;
          } else if (t === "zero") {
            isZero = true;
          } else {
            [...t].forEach(c => {
              if (c === "p" || c === "+") {
                isPositive = true;
              } else if (c === "n" || c === "-") {
                isNegative = true;
              } else if (c === "z") {
                isZero = true;
              }
            })
          }
        }
        // one of the conditions is different
        if (isPositive != isNegative || isPositive != isZero) {
          // both isPositive and isNegative are true and isZero is false so it must be a non-zero value or
          // both isPositive and isNegative are false and isZero is true so it must only be a zero value
          if (isPositive == isNegative) {
            if (isZero) {// it should be only zero
              if (value !== 0) {
                return [null, "Is a number but not zero"];
              }
            } else {// it should be not zero
              if (value === 0) {
                return [null, "Is a number but its zero"];
              }
            }
            // both isPositive and isZero are true and isNegative is false so it must be a non-negative value or
            // both isPositive and isZero are false and isNegative is true so it must only be a negative value
          } else if (isPositive == isZero) {
            if (isNegative) {// it should be only negative
              if (value >= 0) {
                return [null, "Is a number but not negative"];
              }
            } else {// it should be not negative
              if (value < 0) {
                return [null, "Is a number but its negative"];
              }
            }
            // both isNegative and isZero are false and isPositive is true so it must only be a positive value
          } else if (isPositive) {
            if (value <= 0) {
              return [null, "Is a number but not positive"];
            }
            // both isNegative and isZero are true and isPositive is false so it must be a non-positive value
          } else if (value > 0) {
            return [null, "Is a number but its positive"];
          }
        }

        return [value];
      } else {
        return [null, `${valueType} is not a number`];
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
      return [null, `${mainType} is not a valid complex type`]
    }
  } else {
    return [null, "Type must be in a string or array format"]
  }
}
