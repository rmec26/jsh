//@ts-check

export class BadPathError extends Error { };

export function processVariableToList(input) {
  let levelList = [];
  let buffer = "";
  let pos = 0;
  while (pos < input.length) {
    let c = input[pos];
    pos++;
    if (c == ".") {
      levelList.push(buffer);
      buffer = "";
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
  levelList.push(buffer);
  return levelList;
}

export function processPathInput(path) {
  if (typeof path === "string") {
    return processVariableToList(path);
  } else if (path instanceof Array) {
    if (!path.length) {
      throw new BadPathError("Path cannot be an empty array.");
    }
    return path.map(v => v.toString());
  }
  throw new BadPathError("Path is not of the type string or array.");
}