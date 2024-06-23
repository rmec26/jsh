# Template System

## Base objects

* `@` - Value from the POST path
* `@root` - Root of the JSON file on the server
* `@local` - Values set by the `$local` function


## Funtions

### `$`

Usage: `["$", path]`

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



### `$list`

Usage: `["$list", obj, template]`

Creates a list of the values from `obj` by processing each of its values with `template`.

Input:

* `obj`: `<template>` - Final value should be a `object` or `array`.
  * for `object` the key will be the key of each property
  * for `array` the key will be the index of each value
* `template`: `<template>` - Final value can be any type.
  * for each value of `obj` this template will have set to the values `@k` and `@v`
    * `@k` represets the key of the current value of `obj`
    * `@v` represets the current value of `obj`



### `$object`

Usage: `["$object", obj, template]`

Creates an object from `obj` by processing each of its values with `template`.

Input:

* `obj`: `<template>` - Final value should be a `object` or `array`.
  * for `object` the key will be the key of each property
  * for `array` the key will be the index of each value
* `template`: `<template>` - Final value must have the format `{ "k":<any>, "v":<any>}`.
  * for each value of `obj` this template will have set to the values `@k` and `@v`
    * `@k` represets the key of the current value of `obj`
    * `@v` represets the current value of `obj`



### `$literal`

Usage: `["$literal", value]`

Returns `value` as is without trying to process any template in it.

Input:

* `value`: `<any>` - Can be any value, any template ionside it will not be processed.