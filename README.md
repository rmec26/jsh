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
* DELETE `/path+` - deletes the value in the given path and returns it
  * `opc=json` - returns the value in json format
  * `opc=text` - returns the value in text format


## How to Run

Run the command `node <json path> [<port>]`


## TODO

* create json if it doesnt exist
* no file mode, using `-`
* more template functions