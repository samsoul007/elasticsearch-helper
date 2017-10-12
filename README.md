# elasticsearch-helper
A nodejs module to do elasticsearch queries easily

# installation
run `npm install --save elasticsearch-helper`

# usage

## add client
```javascript
let esH = require("elasticsearch-helper")

// Will create a default client
esH.AddClient("127.0.0.1:9200");

// Will create a client with name "client1"
esH.AddClient("client1","127.0.0.1:9200");
```

## use client

The client is chainable which means that you can call functions one after the other until you execute the query.
The query is then returning a promise.

Initialise a query:
```javascript
const esH = require("elasticsearch-helper")

// Querying on index "Index1"
esH.query("Index1");

// Querying on index "Index1" and type "Type1"
esH.query("Index1","Type1");

// Querying on index "Index1" and type "Type1" using the client "Client1"
esH.query("Index1","Type1)".use("Client1")
```

Doing query:

For those example we will use the query variable 'q':
```javascript
//initialise query
var q = esH.query("Index1","Type1");
```

### Single Document

#### GET
```javascript
q.id("ID")
q.run()
  .then(function(hit){
  //return hit object or false if not found
})
```

#### DELETE
```javascript
q.id("ID")
q.delete()
  .then(function(hit){
  //return true
})
```

#### CREATE/OVERWRITE
```javascript
q.id("ID")
q.body({...}) //Data object to store
q.run()
  .then(function(hit){
  //return the data object
})
```

#### UPDATE
```javascript
q.id("ID")
q.update({...}) //Data object to update 
q.run()
  .then(function(hit){
  //return the data object
})
```

### Multiple Documents

#### Types & search options

This helper includes the different search features of Elasticsearch such as `must`, `must_not` etc.

GETs and DELETEs are using the same methodology for querying building. 
Example:
```javascript
q.must(
  //Term type
  esH.addType().term("fieldname","fieldvalue"),
  //Terms type
  esH.addType().terms("fieldname","fieldvalues"),
  //Exists Type
  esH.addType().exists("fieldname"),
  //Range Type
  esH.addType().range({
    gte:1,
    lte:10
  })
)

//Other query methods include
//It is not possible to do nested booleans

q.must_not(
  //Types
)

q.should(
  //Types
)

q.filter(
  //Types
)
```

#### GET
```javascript
q.must(
  //Types
).run().then(function(hits){
  //return array of hits objects
})
```

#### DELETE
Delete by query is only avalaible on Elasticsearch 5.X

```javascript
q.must(
  //Types
).delete().then(function(hits){
  //return array of hits objects
})
```

#### Other options
```javascript

//will retrieve 1000 results maximum
q.size(1000)

//will retrieve the documents values for specific keys
q.fields("name","id")
```

## Full example
```javascript
let esH = require("elasticsearch-helper")

esH.AddClient("client1","127.0.0.1:9200");

esH.query("Index1","Type1")
.use("client1")
.size(10)
.must(
  esH.addType().term("name","John"),
  esH.addType().terms("lastname",["Smith","Wake"])
)
.must_not(
  esH.addType().range("age",{
    lte:20,
    gte:30
  })
)
.run()
.then(function(hits){
  //hits array
})
```

