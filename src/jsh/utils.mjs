//@ts-check

export function isEqual(a, b) {
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