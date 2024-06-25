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

### `$get` or `$`

Usage: `["$get", path]`

Returns the value in the `path` given.

Input:

* `path`: `<template>` - Final value should be a `string` or `array`.
  * the `string` should have the format `@.level1.value`
  * the `array` should have the format `["@", "level1", "value"]`



### `$run`

Usage: `["$run", ...templates]`

Runs the given `templates`, returns nothing.

Input:

* `templates`: `<template>` - can be any value



### `$local`

Usage: `["$local", id, value]`

Sets the property `id` in `@local` object with `value`.

Input:

* `id`: `string`
  * the property will always be set in `@local`, even if appears to have more levels, so `["$local", "test.a"]` will __NOT__ set `@local.test.a`.



### `$map`

Usage: `["$map", obj, template]`

Maps all the values from `obj` into a list by processing each with `template`.

Input:

* `obj`: `<template>` - Final value should be a `object` or `array`.
  * for `object` the key will be the key of each property
  * for `array` the key will be the index of each value
* `template`: `<template>` - Final value can be any type.
  * for each value of `obj` this template will have set to the values `@k` and `@v`
    * `@k` represets the key of the current value of `obj`
    * `@v` represets the current value of `obj`



### `$kmap`

Usage: `["$kmap", obj, template]`

Maps all the values from `obj` into an object by processing each of its values with `template`.

Input:

* `obj`: `<template>` - Final value should be a `object` or `array`.
  * for `object` the key will be the key of each property
  * for `array` the key will be the index of each value
* `template`: `<template>` - Final value must have the format `{ "k":<any>, "v":<any>}`.
  * for each value of `obj` this template will have set to the values `@k` and `@v`
    * `@k` represets the key of the current value of `obj`
    * `@v` represets the current value of `obj`



### `$object` or `$obj`

Usage: `["$object", keyPair, ...]`

Creates an object using the given

Input:

* `[keyPair]`: `<template>` - Final value should have the format `[any, any]`.
  * the first value is the key of the pair, if it isn't a string it will be converted to one.
  * the second value is the value of the pair.



### `$literal` or `$lit`

Usage: `["$literal", value]`

Returns `value` as is without trying to process any template in it.

Input:

* `value`: `<any>` - Can be any value, any template ionside it will not be processed.



### `$size`

Usage: `["$size", value]`

Returns size of `value`.

Input:

* `value`: `<template>` - Final value should be a `object` or `array` or `string`.
  * for `object` the size will be the amount of properties
  * for `array` the size will be the amount of values
  * for `string` the size will be the amount of characters



### `$type`

Usage: `["$size", value]`

Returns the type of `value`.

Input:

* `value`: `<template>` - Final value can be any value.
  * for `array` it will return `array` instead of `object`
  * for `null` it will return `null` instead of `object`



### `$exists`

Usage: `["$exists", path]`

Returns `true` if a value exists in the `path` given, returns `false` otherwise.

Input:

* `path`: `<template>` - Final value should be a `string` or `array`.
  * the `string` should have the format `@.level1.value`
  * the `array` should have the format `["@", "level1", "value"]`



### `$merge`

Usage: `["$merge", srcObj, patchObj, isDeep]`

Return a value that is the merger of `srcObj` with `patchObj`

Input:

* `srcObj`: `<template>` - Final value can be any type.
* `patchObj`: `<template>` - Final value can be any type.
* `patchObj`: `<template>` - Final value is treates as a boolean value.
    * If `true` it does a deep merge
    * If `false` it does a shallow merge
    * It follows the same logic as the `PATCH` endpoint

