# RYJ - REST Your JSON

Simple api to view/edit JSON Files


## API
* GET `/path+` - gets the value in the given path
  * `opc=json` - returns the value in json format
  * `opc=text` - returns the value in text format
* POST `/path+` - processes the given body as a template in the given path
  * `opc=json` - returns the processed template in json format
  * `opc=text` - returns the processed template in text format
* PUT `/path+` - creates/updates the value with the body in the given path
  * `opc=json` - treats the given body as a json
  * `opc=text` - treats the given body as a text
* PATCH `/path+` - patches the existing value in the given path with the body 
  * `opc=json` - does a shallow patch, so only the root object is merged, all others are replaced with the new value
  * `opc=deep` - does a deep patch, so all matching objects are merged
  * Note: Merging is done between object-object, for array-array they are concatnated, for all other types they are simply replaced by the new value
* DELETE `/path+` - deletes the value in the given path and returns it
  * `opc=json` - returns the value in json format
  * `opc=text` - returns the value in text format


## How to Run

Run the command `node ryj.js <json path> [<port>]`

* Note: If the json path given is `-` then the system will just keep the values in memory and not write anything to disk.

* Note: the default port is `8080`.

## Template system


The template system has two functions

`@var.arg1` - gets the desired value

* Note: If you want a string that starts with `@` you need to start it with `@@` instead so that the system doesn't try to process it as a `get` function.

`[ "@", "text1", "text2",...]` - concats the values into a single string


Available objects for the `get` function:
* `root` - represents the root json of the system
* `post` or `this` - represents the selected value from the path given to the `POST` HTTP call