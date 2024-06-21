# REST Your JSON

Simple api to view/edit JSON Files


## API
* GET `/path+` - gets the value in the given path
  * `opc=json` - returns the value in json format
  * `opc=text` - returns the value in text format
  * `opc=keys` - returns the list of key of the value, only for `object` values
    * Format: `{"keys":["key1","key2",...]}`
  * `opc=values` - returns the list of values of the value, only for `object` values
    * Format: `{"values":["value1","value2",...]}`
  * `opc=entries` - returns the list of entries of the value, only for `object` values
    * Format: `{"entries":[["key1","value1"],["key2","value2"],...]}`
  * `opc=type` - returns the type of the value
    * Format: `{"type":"valuetype"}`
    * Possible values: `string`, `number`, `boolean`, `object`, `array`, `null`
  * `opc=size` - returns the size of the value, only for `string`, `object` and `array` values
  * `opc=verbose` - returns a verbose view of the value
    * Format: `{"value":"<the value>","type":"<type>","keys":["key1",...],"values":["value1",...]},"size":<size>`
    * `values` `keys` and `size` only appear if aplicable for the given value
* POST `/path+` - gets the processed template in the given path
  * template functions
    * `{"$":"<relative path>"}` - returns the value in `<relative path>` relative to the value in `path`
* PUT `/path+` - creates/updates the value with the body in the given path
  * `opc=json` - treats the given body as a json
  * `opc=text` - treats the given body as a text
* DELETE `/path+` - deletes the value in the given path and returns it
  * `opc=json` - returns the value in json format
  * `opc=text` - returns the value in text format


## How to Run

Run the command `node <json path> [<port>]`


## TODO

* create json if it doesnt exist
* no file mode, using `-`
* more template functions