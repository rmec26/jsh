//@ts-check

import { BadCallError } from "./errors.mjs";

function processParserBuffer(state) {
  if (state.buffer) {
    let possibleNum = Number(state.buffer);
    if (Number.isNaN(possibleNum)) {
      switch (state.buffer) {
        case "true":
          state.curr.input.push(true);
          break;
        case "false":
          state.curr.input.push(false);
          break;
        case "null":
          state.curr.input.push(null);
          break;
        default:
          state.curr.input.push(state.buffer);
          break;
      }
    } else {
      state.curr.input.push(possibleNum);
    }
    state.buffer = "";
    state.isReading = false;
  }
}

function parseString(state, finalValue) {
  let buffer = "";
  let isRunning = true;
  while (state.pos < state.input.length && isRunning) {
    let c = state.input[state.pos];
    state.pos++;

    if (c == finalValue) {
      isRunning = false;
    } else if (c == "\\") {
      if (state.pos < state.input.length) {
        switch (state.input[state.pos]) {
          case "r":
            buffer += "\r";
            break;
          case "n":
            buffer += "\n";
            break;
          case "t":
            buffer += "\t";
            break;
          default:
            buffer += state.input[state.pos];
            break;
        }
        state.pos++;
      }
    } else {
      buffer += c;
    }
  }

  //If it gets to the end of the input it simply adds whatever is in the buffer
  //TODO consider making this throw an error instead
  state.curr.input.push(buffer);
}

function isWhitespaceChar(c) {
  return c == " " || c == "\r" || c == "\t" || c == "\n" || c == "," || c == ";" || c == ":";
}

function parseVariable(state) {
  let varList = [];
  let buffer = "";
  let isRunning = true;
  while (state.pos < state.input.length && isRunning) {
    let c = state.input[state.pos];
    state.pos++;

    if (isWhitespaceChar(c)) {
      isRunning = false;
    } else if (c == ".") {
      varList.push(buffer);
      buffer = "";
    } else if (c === "(" || c === ")" || c === "[" || c === "]" || c === "{" || c === "}" || c === "#") {
      state.pos--;
      isRunning = false;
    } else if (c == "\\") {
      if (state.pos < state.input.length) {
        buffer += state.input[state.pos];
        state.pos++;
      }
    } else {
      buffer += c;
    }
  }
  //The fact that it can put the last buffer even if empty here is on purpose
  varList.push(buffer);
  state.curr.input.push({ type: "get", input: varList })
}

function startScope(state, type) {
  processParserBuffer(state);
  state.stack.push(state.curr);
  state.curr = { type, input: [] };
}

function endScope(state, type) {
  processParserBuffer(state);
  if (state.curr.type !== type) {
    throw new BadCallError(`Attempting to close '${state.curr.type}' scope with '${type}' end char.`);
  }
  let endScope = state.curr;
  state.curr = state.stack.pop();
  state.curr.input.push(endScope);
}

function processComment(state) {
  while (state.pos < state.input.length) {
    let c = state.input[state.pos];
    state.pos++;
    if (c == '\n') {
      break;
    }
  }
}

export function parseJsh(input) {
  let state = {
    input,
    pos: 0,
    buffer: "",
    isReading: false,
    stack: [],
    curr: { type: "base", input: [] },
  }

  while (state.pos < state.input.length) {
    let c = state.input[state.pos];
    state.pos++;

    if (c == "(") {
      startScope(state, "call");
    } else if (c == ")") {
      endScope(state, "call");
    } else if (c == "[") {
      startScope(state, "list");
    } else if (c == "]") {
      endScope(state, "list");
    } else if (c == "{") {
      startScope(state, "obj");
    } else if (c == "}") {
      endScope(state, "obj");
    } else if (c == "#") {
      processComment(state);
    } else {
      let isWhitespace = isWhitespaceChar(c);
      if (state.isReading) {
        if (isWhitespace) {
          processParserBuffer(state);
        } else if (c == "\\") {
          if (state.pos < state.input.length) {
            state.buffer += state.input[state.pos];
            state.pos++;
          }
        } else {
          state.buffer += c;
        }
      } else {
        if (!isWhitespace) {
          if (c == "\\") {
            state.isReading = true;
            if (state.pos < state.input.length) {
              state.buffer += state.input[state.pos];
              state.pos++;
            }
          } else if (c == "\"" || c == "'") {
            parseString(state, c);
          } else if (c == "@") {
            parseVariable(state);
          } else {
            state.isReading = true;
            state.buffer += c;
          }
        }
      }
    }
  }
  processParserBuffer(state);

  if (state.stack.length) {
    throw new BadCallError(`Open scopes found.`);
  }

  return state.curr;
}
