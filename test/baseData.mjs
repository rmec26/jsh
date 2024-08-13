export function baseData() {
  return {
    books: {
      "book1": { "id": "123", "name": "Book 1", "author": "Author 1", "price": 12.5 },
      "book2": { "id": "456", "name": "Book 2", "author": "Author 2", "price": 15.75 },
      "book3": { "id": "789", "name": "Book 3", "author": "Author 1", "price": 7.99 },
      "book4": { "id": "321", "name": "Book 4", "author": "Author 3", "price": 5 }
    },
    list: [
      { "id": "111", "name": "Test 1", "value": 66 },
      { "id": "222", "name": "Test 2", "value": 26 },
      { "id": "333", "name": "Test 3", "value": 91 },
      { "id": "444", "name": "Test 4", "value": 42 }
    ],
    values: {
      str: "this is a string",
      num: 123,
      bool: true,
      obj: { isObj: true, data: 'neat' },
      array: [1, 2, 4, 8, 16],
      nullVal: null
    }
  }
}