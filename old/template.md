# Template System

## Base objects

* `@` - Value from the POST path
* `@root` - Root of the JSON file on the server
* `@local` - Values set by the `$local` function


## Format

Regular - `["$func","value"]`

Compact - `["$func:value"]`, this only works for one value after the function call and it will always be a `string`
  * `["$func:123"]` is the same as `["$func","123"]` but not `["$func",123]`
  * this still allows for extra input values so `["$func:test", "hello"]` is valid and is functionally the same as `["$func", "test", "hello"]`

## Funtions

If a function is raw it means that the processing of any input is done by the function itself instead of being done before it.

### `$get` or `$`

Usage: `["$get", path]`

Returns the value in the `path` given.

Input:

* `path`: `<string|array>` - Value of the path to get.
  * the `string` should have the format `this.level1.value`
  * the `array` should have the format `["this", "level1", "value"]`



### `$set`

Usage: `["$set", path, value]`

Sets the given `value` in the `path` given.

Input:

* `path`: `<string|array>` - Value of the path to set.
  * the `string` should have the format `this.level1.value`
  * the `array` should have the format `["this", "level1", "value"]`
* `value`: `any` - New value to set



### `$delete` or `$del`

Usage: `["$delete", path]`

Deletes the value in the `path` given.

Input:

* `path`: `<string|array>` - Value of the path to delete.
  * the `string` should have the format `this.level1.value`
  * the `array` should have the format `["this", "level1", "value"]`



### `$run`

Usage: `["$run", ...values]`

Processes any input given, returns nothing.

Input:

* `values`: `<any[]>` - can be any value



### `$map`

Usage: `["$map", obj, template]`

Is raw: `true`

Maps all the values from `obj` into a list by processing each of its values with `template`.

Input:

* `obj`: `<object|array>` - Value to iterate.
  * for `object` the key will be the key of each property
  * for `array` the key will be the index of each value
* `template`: `<template>` - Template used at every iteration to process the value
  * the final value can be any type.
  * for each value of `obj` this template will have set to the values `@k` and `@v`
    * `@k` represets the key of the current value of `obj`
    * `@v` represets the current value of `obj`



### `$kmap`

Usage: `["$kmap", obj, template]`

Is raw: `true`

Maps all the values from `obj` into an object by processing each of its values with `template`.

Input:

* `obj`: `<object|array>` - Value to iterate.
  * for `object` the key will be the key of each property
  * for `array` the key will be the index of each value
* `template`: `<template>` - Template used at every iteration to process the value
  * te final value must have the format `{ "k":<any>, "v":<any>}`.
  * for each value of `obj` this template will have set to the values `@k` and `@v`
    * `@k` represets the key of the current value of `obj`
    * `@v` represets the current value of `obj`



### `$object` or `$obj`

Usage: `["$object", ...keyPairs]`

Creates an object using the given entry pairs

Input:

* `keyPairs`: `<[any, any][]>` - key value pairs that will be set in the final object.
  * the first value is the key of the pair, if it isn't a string it will be converted to one.
  * the second value is the value of the pair.



### `$literal` or `$lit`

Usage: `["$literal", value]`

Is raw: `true`

Returns `value` as is without trying to process any of it.

Input:

* `value`: `<any>` - Can be any value, any template inside it will not be processed.



### `$size`

Usage: `["$size", value]`

Returns size of `value`.

Input:

* `value`: `<object|array|string>` - Value to return the size of.
  * for `object` the size will be the amount of properties
  * for `array` the size will be the amount of values
  * for `string` the size will be the amount of characters



### `$type`

Usage: `["$size", value]`

Returns the type of `value`.

Input:

* `value`: `<any>` - Value to return the type of.
  * for `array` it will return `array` instead of `object`
  * for `null` it will return `null` instead of `object`



### `$exists`

Usage: `["$exists", path]`

Returns `true` if a value exists in the `path` given, returns `false` otherwise.

Input:

Input:

* `path`: `<string|array>` - Value of the path to check. The first element must start with `@`
  * the `string` should have the format `@.level1.value`
  * the `array` should have the format `["@", "level1", "value"]`



### `$merge`

Usage: `["$merge", srcObj, patchObj, isDeep]`

Return a value that is the merger of `srcObj` with `patchObj`

Input:

* `srcObj`: `<any>` - Source value of the merger.
* `patchObj`: `<any>` - Value to add values from to the source.
* `isDeep`: `<any>` - Indicates if the merging is shallow or deep. Value is treated as a `boolean`.
    * If `true` it does a deep merge
    * If `false` it does a shallow merge
    * It follows the same logic as the `PATCH` endpoint



### `$query`

Usage: `["$query", input]`

Parses the given `input` as a `query` into a valid template, runs it and returns the last returned value

Input:

* `input`: `<string>` - Query to process.



### `$parse`

Usage: `["$parse", input]`

Parses the given `input` as a `query` into a valid template and returns it.

Input:

* `input`: `<string>` - Query to parse.



### `$exec`

Usage: `["$exec", input]`

Runs the given `input` and returns the last returned value

Input:

* `input`: `<template[]>` - Parsed input to execute.



### `$add` or `$+`

Usage: `["$add", a, b]`

Adds `b` to `a` and returns the result.

Input:

* `a`: `<number>`
* `b`: `<number>`



### `$subtract`, `$sub` or `$-`

Usage: `["$subtract", a, b]`

Subtracts `b` from `a` and returns the result.

Input:

* `a`: `<number>`
* `b`: `<number>`



### `$multiply`, `$mul` or `$*`

Usage: `["$multiply", a, b]`

multiplies `a` with `b` and returns the result.

Input:

* `a`: `<number>`
* `b`: `<number>`



### `$divide`, `$div` or `$/`

Usage: `["$divide", a, b]`

Divides `a` with `b` and returns the result.
Input:

* `a`: `<number>`
* `b`: `<number>`



### `$integerDivide`, `$idiv` or `$//`

Usage: `["$integerDivide", a, b]`

Divides `a` with `b` and returns the integer result.
Input:

* `a`: `<number>`
* `b`: `<number>`



### `$modulo`, `$mod` or `$%`

Usage: `["$modulo", a, b]`

Returns the modulo of `a` with `b`.

Input:

* `a`: `<number>`
* `b`: `<number>`



### `$truncate` or `$trunc`

Usage: `["$truncate", a]`

Returns the integer part of `a`.

Input:

* `a`: `<number>`



### `$string` or `$str`

Usage: `["$string", value]`

Converts the given `value` into a `string`.

Input:

* `value`: `<any>` - value to convert



### `$boolean` or `$bool`

Usage: `["$boolean", value]`

Converts the given `value` into a `boolean`.

Input:

* `value`: `<any>` - value to convert
  * If the value is an `array` or an `object` then it will return `true` if it has values and `false` otherwise.
  * If the value is a `number` it will return `true` if the value is not `0` and `false` if `0`.
  * If the value is a `string` it will return `true` if its not an empty string and `false` if it is.
  * If the value is `null` it will return `false`.



### `$number` or `$num`

Usage: `["$number", value]`

Converts the given `value` into a `number`.

Input:

* `value`: `<any>` - value to convert
  * If the value is an `array` or an `object` then it will return `1` if it has values and `0` otherwise.
  * If the value is a `boolean` it will return `1` if the value is `true` and `0` if `false`.
  * If the value is a `string` it will return parsed `number` from the string.
  * If the value is `null` it will return `0`.




### `$integer` or `$int`

Usage: `["$integer", value]`

Converts the given `value` into a `number` and returns the integer part.

Input:

* `value`: `<any>` - value to convert
  * If the value is an `array` or an `object` then it will return `1` if it has values and `0` otherwise.
  * If the value is a `boolean` it will return `1` if the value is `true` and `0` if `false`.
  * If the value is a `string` it will return parsed `number` from the string.
  * If the value is `null` it will return `0`.



### `$json`

Usage: `["$json", value]`

Parses the given `value` as a JSON and returns the parsed object.

Input:

* `value`: `<any>` - value to parse



### `$equals`, `$eq` or `$==`

Usage: `["$equals", a, b]`

Returns `true` if the value `a` is the same as `b`, returns `false` otherwise.

Input:

* `a`: `<any>`
* `b`: `<any>`



### `$notEquals`, `$ne` or `$!=`

Usage: `["$notEquals", a, b]`

Returns `true` if the value `a` is not the same as `b`, returns `false` otherwise.

Input:

* `a`: `<any>`
* `b`: `<any>`



### `$greater`, `$gt` or `$>`

Usage: `["$greater", a, b]`

Returns `true` if the value `a` is greater than `b`, returns `false` otherwise.

Note: only works if both `a` and `b` have the same type.

Input:

* `a`: `<string|number>`
* `b`: `<string|number>`



### `$less`, `$lt` or `$<`

Usage: `["$greater", a, b]`

Returns `true` if the value `a` is less than `b`, returns `false` otherwise.

Note: only works if both `a` and `b` have the same type.

Input:

* `a`: `<string|number>`
* `b`: `<string|number>`



### `$greaterEqual`, `$gte` or `$>=`

Usage: `["$greater", a, b]`

Returns `true` if the value `a` is greater than or equal to `b`, returns `false` otherwise.

Note: only works if both `a` and `b` have the same type.

Input:

* `a`: `<string|number>`
* `b`: `<string|number>`



### `$lessEqual`, `$lte` or `$<=`

Usage: `["$greater", a, b]`

Returns `true` if the value `a` is less than or equal to `b`, returns `false` otherwise.

Note: only works if both `a` and `b` have the same type.

Input:

* `a`: `<string|number>`
* `b`: `<string|number>`



### `$if`

Usage: `["$if", condition, then, else]`

Is raw: `true`

Runs the `condition` and if it returns `true` runs the `then`, else it runs the `else`.

Input:

* `condition`: `<any>` - the final value will be converted to a boolean using the same logic as thew `$boolean` function
* `then`: `<template>` - template that is run if the condition is `true`
* `else`: `<template>` - template that is run if the condition is `false`, its optional



### `$join`

Usage: `["$join", values, separator]`

Joins all `values` into a single `string`.

Input:

* `values`: `<array>` - values to be converted, any value not a `string` will be converted to one.
* `separator`: `<string>` - `string` that is put between the `values`, its optional



### `$sum`

Usage: `["$sum", values]`

Sums all `values` into a single `number`.

Input:

* `values`: `<array>` - values to be summed, any value not a `number` will be ignored.




### `$slice`

Usage: `["$slice", obj, start, end]`

Returns a slice of `obj` from `start` to `end`.

Input:

* `obj`: `<array|string>` - value to be sliced
* `start`: `<number>` - start of the slice
* `end`: `<number>` - end of the slice, its optional



### `$minimum` or `$min`

Usage: `["$minimum", values]`

Returns the minimum value of all `values`.

Input:

* `values`: `<array>` - values to be checked, any value not a `number` will be ignored.



### `$maximum` or `$max`

Usage: `["$maximum", values]`

Returns the maximum value of all `values`.

Input:

* `values`: `<array>` - values to be checked, any value not a `number` will be ignored.


