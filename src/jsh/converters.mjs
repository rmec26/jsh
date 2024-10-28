//@ts-check

export function toBoolean(value) {
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

export function toString(value) {
  if (value === undefined) {
    return;
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  } else {
    return value.toString();
  }
}

export function toNumber(value) {
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

export function toInteger(value) {
  let res = toNumber(value);
  if (value !== undefined) {
    return Math.trunc(res);
  }
}
