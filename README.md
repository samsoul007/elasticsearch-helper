


# elasticsearch-helper [![npm version](https://badge.fury.io/js/elasticsearch-helper.svg)](https://badge.fury.io/js/elasticsearch-helper) [![NSP Status](https://nodesecurity.io/orgs/jacques-sirot/projects/60dd35a8-0efd-415e-9f72-2e7300f888ef/badge)](https://nodesecurity.io/orgs/jacques-sirot/projects/60dd35a8-0efd-415e-9f72-2e7300f888ef)

[npm-image]: https://img.shields.io/npm/v/aerospike.svg
[npm-url]: https://www.npmjs.com/package/aerospike
[downloads-image]: https://img.shields.io/npm/dm/aerospike.svg
[downloads-url]: http://npm-stat.com/charts.html?package=aerospike

A nodejs module to do elasticsearch queries easily

<img src="https://static-www.elastic.co/assets/blteb1c97719574938d/logo-elastic-elasticsearch-lt.svg?q=294" width="200" />

# disclaimer

I experienced a lot of issues in the past due to the way Elasticsearch handles the queries. I decided to create helper that we currently use on production level at https://headhunterportal.com and some other projects and so far it had helped us to drastically reduce the complexity of readability of our code.

With this helper you will be able to query your elasticsearch clusters very easily. Everything is chainable and the query always returns a promise.

NOTE: Even if we use this on production level still find bugs and add improvements to the module codebase. Feel free to for it and modify it for your own needs.

# installation

`npm install --save elasticsearch-helper`

# usage

## add client

```javascript
let esH = require("elasticsearch-helper")

// Will create a default client
esH.AddClient("127.0.0.1:9200");

// Will create a client with name "client1"
esH.AddClient("client1","127.0.0.1:9200");

// Will create a client with name "client1" and will be used as default
esH.AddClient("client1","127.0.0.1:9200",true);
```

## use client

The client is chainable which means that you can call functions one after the other until you execute the query. The query is then returning a promise.

Initialise a query:

```javascript
const esH = require("elasticsearch-helper")

// Querying on index "Index1"
esH.query("Index1");

// Querying on all indexes starting with "Index"
esH.query("Index*");

// Querying on index "Index1" and type "Type1"
esH.query("Index1","Type1");

// Querying on index "Index1" and type "Type1" using the client "Client1"
esH.query("Index1","Type1)".use("Client1")
```

Doing query:

For those example we will use the query variable 'q':

```javascript
// initialise query
var q = esH.query("Index1","Type1");
```

### Single Document

#### Retrieve

```javascript
q.id("ID")
q.run()
  .then(function(hit){
  // return hit object or false if not found
  console.log(hit.id()) // get Document ID
  console.log(hit.index()) // get Document index
  console.log(hit.type()) // get Document type
  console.log(hit.data()) // get Document source
})
```

#### Delete

```javascript
q.id("ID")
q.delete()
  .then(function(hit){
  // return true
})
```

#### Create/Overwrite

```javascript
q.id("ID")
q.body({...}) // Data object to store
q.run()
  .then(function(hit){
  // return the data object
})
```

#### Update

```javascript
q.id("ID")
q.update({...}) // Data object to update
q.run()
  .then(function(hit){
  // return the data object
})
```

### Multiple Documents

#### Types & search options

This helper includes the different search features of Elasticsearch such as `must`, `must_not` etc.

GETs and DELETEs are using the same methodology for querying building. Example:

```javascript
q.must(
  // Term type
  esH.type.term("fieldname","fieldvalue"),
  // Terms type
  esH.type.terms("fieldname","fieldvalues"),
  // Exists Type
  esH.type.exists("fieldname"),
  // Range Type
  esH.type.range({
    gte:1,
    lte:10
  }),
  // Add a sub filter in the query
  esH.filter.should(
    esH.type.terms("fieldname2","fieldvalues")
  )
)

// Other query methods include
// It is not possible to do nested booleans

q.must_not(
  // Types
)

q.should(
  // Types
)

q.filter(
  // Types
)
```

#### Retrieve

```javascript
q.must(
  // Types
).run().then(function(hits){
  // return array of hits objects
  var hit = hits[0];
  console.log(hit.id()) // get Document ID
  console.log(hit.index()) // get Document index
  console.log(hit.type()) // get Document type
  console.log(hit.data()) // get Document source
})
```

#### Delete

Delete by query is only avalaible on Elasticsearch 5.X

```javascript
q.must(
  // Types
).delete().then(function(hits){
  // return array of hits objects
})
```

#### aggregations // BETA

Elasticsearch has a very powerful aggregation system but the way to handle it can be tricky. I tried to solve this issue by wrapping it in what I think is the simplest way.

NOTE: Right now I only handle 2 types of aggregation, `terms` and `date_histogram`

```javascript
q.aggs(
  ES.agg.date_histogram("created_date")("date_created","1d")
    // Child aggregation to the "created_date" aggregation
    .aggs(
      ES.agg.terms("first_name")("data.first_name")
    )
  // Add more aggregations
).run()
.then(function(response){
  // retrieve the "created_date" aggregation
  var arrayAggList = response.agg("created_date")
  var arrayValues = arrayAggList.values() // return an array of values objects. array types values will depend on the aggregation type

  var firstValue = arrayValues[0];
  var valueID = firstValue.id(); // key of the value. If it is a date_histogram type it will be a moment object
  var valueData = firstValue.data(); // value of the aggregation for this key.


  // To retrieve a child aggregation:
  // Note: Each parent aggregation value has its own aggregation so you will have to loop through to get the child aggregation

  var arrayChildAggList = arrayAggList.agg("first_name");
  for(var parentKeyvalue in arrayChildAggList){
    arrayChildAggList[parentKeyvalue].values().forEach(function(value){
      console.log(parentKeyvalue, value.id(),value.data());
    })
  }

})
```

#### Other options

```javascript

// will retrieve 1000 results maximum
// all queries with a size over 500 will be converted into a scroll.
q.size(1000)

// will retrieve the documents values for specific keys
q.fields("name","id")
```

## Examples


#### Query
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

#### Query with aggregation

```javascript
let esH = require("elasticsearch-helper")

esH.AddClient("client1","127.0.0.1:9200");

esH.Query("user")
.size(1001) // when an aggregation is set, size is set to 0.
.must(
  esH.type.term("name","jacques"),
  esH.type.range("age",{gt:20,lte:40}),
  esH.filter.should(
    esH.type.term("color","blue"),
    esH.type.term("vehicle","car")
  )
)
.aggs(
  esH.agg.date_histogram("created_date")("date_created","1d")
    // Child aggregation to the "created_date" aggregation
    .aggs(
      esH.agg.terms("first_name")("data.first_name.raw")
    )
)
.run()
.then(function(response){
  // retrieve the "created_date" aggregation
  var arrayAggList = response.agg("created_date")
  var arrayValues = arrayAggList.values() // return an array of values objects. array types values will depend on the aggregation type

  var firstValue = arrayValues[0];
  var valueID = firstValue.id(); // key of the value. If it is a date_histogram type it will be a moment object
  var valueData = firstValue.data(); // value of the aggregation for this key.


  // To retrieve a child aggregation:
  // Note: Each parent aggregation value has its own aggregation so you will have to loop through to get the child aggregation
  var arrayChildAggList = arrayAggList.agg("first_name");
  for(var parentKeyvalue in arrayChildAggList){
    arrayChildAggList[parentKeyvalue].values().forEach(function(value){
      console.log(parentKeyvalue, value.id(),value.data());
    })
  }
}).catch(function(err){
  // error
  console.log(err)
})

```
