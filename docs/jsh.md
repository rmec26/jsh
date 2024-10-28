# JSH - JsoniSH

This is a programming language compatible with the JSON format.

## Base objects

* `root` - Root of the JSON file on the server
* `this` - Value from the POST path


## Format

[v1, v2] - defines an array of values
{k:v} - defines a object
(fn arg1 arg2) - calls function `fn` with give args 
@var.param - gets the value `var.param
#comment - Comments a line
str - defines the string `str`
"hello world" - defines the string `hello world`
123.45 - defines a number
true - defines a `true` boolean
false - defines a `false` boolean
null - defines a `null` value

## Funtions

This is a list of all avaiilable functions on the system.

### `get`

#### `(get, getPath)`

Returns the value in the given path.

Throws error if no value exists in the given path.

| Param | Type | Description |
|---|---|---|
| getPath | `path` | Path of the value to get |



### `set`

#### `(set, setPath, newValue)`

Sets the value in the given path.

Throws error if the parent value doesn't exist or if it can't have the desired parameter set.

| Param | Type | Description |
|---|---|---|
| setPath | `path` | Path of the value to set |
| newValue | `any` | New value to set |



### `delete` or `del`

#### `(delete, deletePath)`

Deletes the value in the given path and returns it.

Throws error if no value exists in the given path.

| Param | Type | Description |
|---|---|---|
| deletePath | `path` | Path of the value to delete |



### `run`

#### `(run, ...input)`

Processes any `input` given, returns nothing.

| Param | Type | Description |
|---|---|---|
| ...input | `template` | input that is run |



### `runr`

#### `(runr, ...input)`

Processes any `input` given, returns the last value returned by an input.

| Param | Type | Description |
|---|---|---|
| ...input | `template` | input that is run |

#### Notes
This returns the last value from **all** the inputs and not the result from the last one.

e.g. given `(runr, (call1), (call2), (call3))` where `call1` and `call2` return a value but `call3` doesn't the result from the `runr` will be the same as `call2`.



### `map`

#### `(map, inputValue, valuePath, keyPath, mapping)`

Maps all the values from `inputValue` into a new array by processing each of its values with the `mapping`.

If the `mapping` doesn't return a value then it will simply be ignored in the final result.

For each iteration it sets the variable in the `valuePath` with the current value on the array/object or the current character on the string

For each iteration it sets the variable in the `keyPath` with the current index, **as a `string`**, on the array/string or the current key on the object

| Param | Type | Description |
|---|---|---|
| inputValue | `[or,array,object,string]` | input value that is processed |
| valuePath | `path` | path to set the current value into |
| keyPath | `path` | path to set the current index/key into |
| mapping | `template` | template run at each iteration that returns the new value to map to |

#### `(map, inputValue, valuePath, mapping)`

Maps all the values from `inputValue` into a new array by processing each of its values with the `mapping`.

If the `mapping` doesn't return a value then it will simply be ignored in the final result.

For each iteration it sets the variable in the `valuePath` with the current value on the array/object or the current character on the string

| Param | Type | Description |
|---|---|---|
| inputValue | `[or,array,object,string]` | input value that is processed |
| valuePath | `path` | path to set the current value into |
| mapping | `template` | template run at each iteration that returns the new value to map to |



### `kmap`

#### `(kmap, inputValue, valuePath, keyPath, mapping)`

Maps all the values from `inputValue` into a single object by processing each of its values with the `mapping`.

The `mapping` return value must have the format `{k:any,v:any}`, if it isn't or if it doesn't return anything it is simply ignored.

For each iteration it sets the variable in the `valuePath` with the current value on the array/object or the current character on the string

For each iteration it sets the variable in the `keyPath` with the current index, **as a `string`**, on the array/string or the current key on the object

| Param | Type | Description |
|---|---|---|
| inputValue | `[or,array,object,string]` | input value that is processed |
| valuePath | `path` | path to set the current value into |
| keyPath | `path` | path to set the current index/key into |
| mapping | `template` | template run at each iteration that returns the new value to map into the final object |

#### `(kmap, inputValue, valuePath, mapping)`

Maps all the values from `inputValue` into a single object by processing each of its values with the `mapping`.

The `mapping` return value must have the format `{k:any,v:any}`, if it isn't or if it doesn't return anything it is simply ignored.

For each iteration it sets the variable in the `valuePath` with the current value on the array/object or the current character on the string

| Param | Type | Description |
|---|---|---|
| inputValue | `[or,array,object,string]` | input value that is processed |
| valuePath | `path` | path to set the current value into |
| mapping | `template` | template run at each iteration that returns the new value to map into the final object |



### `for`

#### `(for, inputValue, valuePath, keyPath, mapping)`

Processes all the values from `inputValue` with the `mapping` and returns the result of the last processed value.

For each iteration it sets the variable in the `valuePath` with the current value on the array/object or the current character on the string

For each iteration it sets the variable in the `keyPath` with the current index, **as a `string`**, on the array/string or the current key on the object

| Param | Type | Description |
|---|---|---|
| inputValue | `[or,array,object,string]` | input value that is processed |
| valuePath | `path` | path to set the current value into |
| keyPath | `path` | path to set the current index/key into |
| mapping | `template` | template run at each iteration |

#### `(for, inputValue, valuePath, keyPath, mapping)`

Processes all the values from `inputValue` with the `mapping` and returns the result of the last processed value.

Only the last value will be returned if the mapping itseft returns a value.

For each iteration it sets the variable in the `valuePath` with the current value on the array/object or the current character on the string

| Param | Type | Description |
|---|---|---|
| inputValue | `[or,array,object,string]` | input value that is processed |
| valuePath | `path` | path to set the current value into |
| mapping | `template` | template run at each iteration |



### `size`

#### `(size, value)`

Returns the size of `value`.

If the `value` is an array/object the size is the amount of values it contains.

If the `value` is a string the size is the number of characters it has.

| Param | Type | Description |
|---|---|---|
| value | `[or,array,string,object]` | value to the return the size of |



### `type`

#### `(type, value)`

Returns the type of `value`.

| Param | Type | Description |
|---|---|---|
| value | `any` | value to the return the type of |



### `exists`

#### `(exists, varPath)`

Returns a `boolean` that indicates if a value exists in the given path.

| Param | Type | Description |
|---|---|---|
| varPath | `path` | path to check |



### `merge`

Usage: `(merge, srcObj, patchObj, isDeep)`

Return a value that is the merger of `srcObj` with `patchObj`

Input:

* `srcObj`: `<any>` - Source value of the merger.
* `patchObj`: `<any>` - Value to add values from to the source.
* `isDeep`: `<any>` - Indicates if the merging is shallow or deep. Value is treated as a `boolean`.
    * If `true` it does a deep merge
    * If `false` it does a shallow merge
    * It follows the same logic as the `PATCH` endpoint



### `jsh`

Usage: `(jsh, input)`

Parses the given `input` as a `jsh` into a valid template, runs it and returns the last returned value

Input:

* `input`: `<string>` - Input to process.



### `add` or `+`

Usage: `(add, a, b)`

Adds `b` to `a` and returns the result.

Input:

* `a`: `<number>`
* `b`: `<number>`



### `subtract`, `sub` or `-`

Usage: `(subtract, a, b)`

Subtracts `b` from `a` and returns the result.

Input:

* `a`: `<number>`
* `b`: `<number>`



### `multiply`, `mul` or `*`

Usage: `(multiply, a, b)`

multiplies `a` with `b` and returns the result.

Input:

* `a`: `<number>`
* `b`: `<number>`



### `divide`, `div` or `/`

Usage: `(divide, a, b)`

Divides `a` with `b` and returns the result.
Input:

* `a`: `<number>`
* `b`: `<number>`



### `integerDivide`, `idiv` or `//`

Usage: `(integerDivide, a, b)`

Divides `a` with `b` and returns the integer result.
Input:

* `a`: `<number>`
* `b`: `<number>`



### `modulo`, `mod` or `%`

Usage: `(modulo, a, b)`

Returns the modulo of `a` with `b`.

Input:

* `a`: `<number>`
* `b`: `<number>`



### `truncate` or `trunc`

Usage: `(truncate, a)`

Returns the integer part of `a`.

Input:

* `a`: `<number>`



### `string` or `str`

Usage: `(string, value)`

Converts the given `value` into a `string`.

Input:

* `value`: `<any>` - value to convert



### `boolean` or `bool`

Usage: `(boolean, value)`

Converts the given `value` into a `boolean`.

Input:

* `value`: `<any>` - value to convert
  * If the value is an `array` or an `object` then it will return `true` if it has values and `false` otherwise.
  * If the value is a `number` it will return `true` if the value is not `0` and `false` if `0`.
  * If the value is a `string` it will return `true` if its not an empty string and `false` if it is.
  * If the value is `null` it will return `false`.



### `number` or `num`

Usage: `(number, value)`

Converts the given `value` into a `number`.

Input:

* `value`: `<any>` - value to convert
  * If the value is an `array` or an `object` then it will return `1` if it has values and `0` otherwise.
  * If the value is a `boolean` it will return `1` if the value is `true` and `0` if `false`.
  * If the value is a `string` it will return parsed `number` from the string.
  * If the value is `null` it will return `0`.




### `integer` or `int`

Usage: `(integer, value)`

Converts the given `value` into a `number` and returns the integer part.

Input:

* `value`: `<any>` - value to convert
  * If the value is an `array` or an `object` then it will return `1` if it has values and `0` otherwise.
  * If the value is a `boolean` it will return `1` if the value is `true` and `0` if `false`.
  * If the value is a `string` it will return parsed `number` from the string.
  * If the value is `null` it will return `0`.



### `equals`, `eq` or `==`

Usage: `(equals, a, b)`

Returns `true` if the value `a` is the same as `b`, returns `false` otherwise.

Input:

* `a`: `<any>`
* `b`: `<any>`



### `notEquals`, `ne` or `!=`

Usage: `(notEquals, a, b)`

Returns `true` if the value `a` is not the same as `b`, returns `false` otherwise.

Input:

* `a`: `<any>`
* `b`: `<any>`



### `greater`, `gt` or `>`

Usage: `(greater, a, b)`

Returns `true` if the value `a` is greater than `b`, returns `false` otherwise.

Note: only works if both `a` and `b` have the same type.

Input:

* `a`: `<string|number>`
* `b`: `<string|number>`



### `less`, `lt` or `<`

Usage: `(greater, a, b)`

Returns `true` if the value `a` is less than `b`, returns `false` otherwise.

Note: only works if both `a` and `b` have the same type.

Input:

* `a`: `<string|number>`
* `b`: `<string|number>`



### `greaterEqual`, `gte` or `>=`

Usage: `(greater, a, b)`

Returns `true` if the value `a` is greater than or equal to `b`, returns `false` otherwise.

Note: only works if both `a` and `b` have the same type.

Input:

* `a`: `<string|number>`
* `b`: `<string|number>`



### `lessEqual`, `lte` or `<=`

Usage: `(greater, a, b)`

Returns `true` if the value `a` is less than or equal to `b`, returns `false` otherwise.

Note: only works if both `a` and `b` have the same type.

Input:

* `a`: `<string|number>`
* `b`: `<string|number>`



### `if`

Usage: `(if, condition, then, else?)`

Is raw: `true`

Runs the `condition` and if it returns `true` runs the `then`, else it runs the `else`.

Input:

* `condition`: `<any>` - the final value will be converted to a boolean using the same logic as thew `boolean` function
* `then`: `<template>` - template that is run if the condition is `true`
* `else`: `<template>` - template that is run if the condition is `false`, its optional



### `join`

Usage: `(join, values, separator?)`

Joins all `values` into a single `string`.

Input:

* `values`: `<array>` - values to be converted, any value not a `string` will be converted to one.
* `separator`: `<string>` - `string` that is put between the `values`, its optional



### `sum`

Usage: `(sum, values)`

Sums all `values` into a single `number`.

Input:

* `values`: `<array>` - values to be summed, any value not a `number` will be ignored.




### `slice`

Usage: `(slice, obj, start, end?)`

Returns a slice of `obj` from `start` to `end`.

Input:

* `obj`: `<array|string>` - value to be sliced
* `start`: `<number>` - start of the slice
* `end`: `<number>` - end of the slice, its optional



### `minimum` or `min`

Usage: `(minimum, values)`

Returns the minimum value of all `values`.

Input:

* `values`: `<array>` - values to be checked, any value not a `number` will be ignored.



### `maximum` or `max`

Usage: `(maximum, values)`

Returns the maximum value of all `values`.

Input:

* `values`: `<array>` - values to be checked, any value not a `number` will be ignored.


