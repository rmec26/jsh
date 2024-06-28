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

* `path`: `<string|array>` - Value of the path to get. The first element must start with `@`
  * the `string` should have the format `@.level1.value`
  * the `array` should have the format `["@", "level1", "value"]`



### `$run`

Usage: `["$run", ...values]`

Processes any input given, returns nothing.

Input:

* `values`: `<any[]>` - can be any value



### `$local`

Usage: `["$local", id, value]`

Sets the property `id` in `@local` object with `value`.

Input:

* `id`: `<any>` - id for the value to set.
  * if the values isn't a `string`it will be converted to one
  * the property will always be set directly in `@local`, even if appears to have more levels, so `["$local", "test.a"]` will __NOT__ set `["@local", "test", "a"]`/`@local.test.a` but instead will set `["@local","test.a"]`.



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