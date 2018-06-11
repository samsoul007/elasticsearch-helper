


# elasticsearch-helper [![npm version](https://badge.fury.io/js/elasticsearch-helper.svg)](https://badge.fury.io/js/elasticsearch-helper) [![NSP Status](https://nodesecurity.io/orgs/jacques-sirot/projects/60dd35a8-0efd-415e-9f72-2e7300f888ef/badge)](https://nodesecurity.io/orgs/jacques-sirot/projects/60dd35a8-0efd-415e-9f72-2e7300f888ef)

A Nodejs module facilitating querying Elasticsearch clusters.

<img src="https://static-www.elastic.co/assets/blteb1c97719574938d/logo-elastic-elasticsearch-lt.svg?q=294" width="200" />

# disclaimer

I experienced a lot of issues in the past due to the way Elasticsearch handles the queries. I decided to create this helper which we currently use on production level at https://headhunterportal.com and some other projects and had helped us to drastically improve the readability of our code.

With this helper you will be able to query your elasticsearch clusters very easily. Everything is chainable and the query always returns a promise.



NOTE: Even if we use this on production level, we still find bugs and add improvements to the module codebase. Feel free to fork it and modify it for your own needs.

If you like this package don't hesitate to drop a :star: :smile:

# installation

`npm install --save elasticsearch-helper`

# usage
˛
## Add client

```javascript
let esH = require("elasticsearch-helper")

// Will create a default client
esH.addClient("127.0.0.1:9200");

// Will create a client with name "client1"
esH.addClient("client1","127.0.0.1:9200");

// Will create a client with name "client1" and will be used as default
esH.addClient("client1","127.0.0.1:9200",true);

// Alias:
esH.AddClient(...)
```

## Use client

The client is chainable which means that you can call functions one after the other until you execute the query. The query is then returning a promise.

Initialise a query:

```javascript
// Querying on index "Index1"
esH.query("Index1");

// Querying on all indexes starting with "Index"
esH.query("Index*");

// Querying on index "Index1" and type "Type1"
esH.query("Index1","Type1");

// Querying on index "Index1" and type "Type1" using the client "Client1"
esH.query("Index1","Type1)".use("Client1")
```

## Indexes

We implemented some helpers based on what we were using a lot.

New ones will be added over time.

NOTE: All those methods return a promise.

### copyTo

Easily copy an index/type to another client/index/type using bulk inserts.

NOTE1: you can copy based on a query, check below to see how to do queries.

NOTE2: If you want to copy millions of rows remember to set `size()`
, Elasticsearch-helper will create a scroll.


```javascript

//Copy from index1 to index2
esH.query("Index1")
.copyTo(esH.query("Index2"));

//Copy from index1 to index2 on client2
esH.query("Index1")
.copyTo(esH.query("Index2").use("client2"));

//Copy from index1, type1 to index2, type1
esH.query("Index1","Type1")
.copyTo(esH.query("Index2"));

//Copy from index1, type1 to index2, type2
esH.query("Index1","Type1")
.copyTo(esH.query("Index2","Type2"));

//Copy documents with first name is Josh from index1 to index2
esH.query("Index1")
.must(
  esH.type.term("first_name","Josh"),
)
.copyTo(esH.query("Index2"));
```

### deleteIndex

Delete an index

WARNING: This operation is final and cannot be reverted unless you have a snapshot, use at you own risk.

NOTE: For security reason you cannot delete multiple indexes at the same time.

```javascript

//Delete index1
esH.query("Index1")
.deleteIndex();

//Delete index1 from client2
esH.query("Index1")
.use("client2")
.deleteIndex();
```

### exists

Check if an index exists.

```javascript

esH.query("Index1")
.exists();

esH.query("Index1")
.use("client2")
.exists();
```

### error handling

A method can be created to handle errors (like logging or formating), This error method is part of a Promise and should return something if it needs to keep processing.

**Errors are always processed as Promise rejection**

```javascript

// Global error handling for all queries
esH.onError(function(err){
  console.log("This message will appear after every error")
  return err;
})

// Query specific error handling
esH.query("Index1","Type1")
.onError(function(err){
  //This onError will overwrite the global onError method for this query.
  console.log("This message will appear after this query has an error")
  return err;
})
```


## Documents

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
 .run()
  .then(function(hit){
  // return hit object or false if not found
  console.log(hit.id())     // get Document ID
  console.log(hit.index())  // get Document index
  console.log(hit.type())   // get Document type
  console.log(hit.data())   // get Document source
})
```

#### Delete

```javascript
q.id("ID")
 .delete()
  .then(function(hit){
  // return true
})
```

#### Create/Overwrite

```javascript
q.id("ID")
 .body({...}) // Data object to store
 .run()
  .then(function(hit){
  // return the data object
})
```

#### Update

```javascript
q.id("ID")
 .update({...}) // Data object to update
 .run()
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
  // Add a sub filter in the query
  esH.filter.should(
    esH.type.terms("fieldname2","fieldvalues")
  )
)
```
##### Filter types
* must

```javascript
  esH.filter.must(/* search types as arguments */);
```
* must_not

```javascript
  esH.filter.must_not(/* search types as arguments */);
```
* should

```javascript
  esH.filter.should(/* search types as arguments */);
```
* filter

```javascript
  esH.filter.filter(/* search types as arguments */);
```

##### Search types

NOTE: not all types are currently implemented. Others will be added over time.

* term

```javascript
  esH.type.term("fieldkey","fieldvalue");
  // ex:
  esH.type.term("name.first_name","josh");
```
* terms

```javascript
  esH.type.terms("fieldkey","fieldvalues as array");
  // ex:
  esH.type.terms("name.first_name",["josh","alan","jack"]);
```
* exists

```javascript
  esH.type.exists("fieldkey");
  // ex:
  esH.type.exists("name.first_name");
```
* range

```javascript
  esH.type.range("fieldkey","range object options");
  // ex:
  esH.type.range("age",{
    gte: 10,
    lte: 30
  });
```

* wildcard

```javascript
  esH.type.wildcard("fieldkey","fieldvalue");
  // ex:
  esH.type.wildcard("name.first_name","josh*");
```

* prefix

```javascript
  esH.type.prefix("fieldkey","fieldvalue");
  // ex:
  esH.type.prefix("name.first_name","josh");
```

NOTE: You can still use the old way of adding a type:
```javascript
  esH.addType().term("fieldkey","fieldvalue");
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

#### Count

Count the documents

```javascript
q.must(
  // Types
).count().then(function(count){
  // return count of documents
})
```

#### aggregations [BETA]

Elasticsearch has a very powerful aggregation system but the way to handle it can be tricky. I tried to solve this issue by wrapping it in what I think is the simplest way.

NOTE: Right now I only handle 2 types of aggregation, `terms` and `date_histogram`, others will be added over time.

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

##### Aggregation types

* terms

```javascript
ES.agg.terms("aggregation name")("field to aggregate on"[,"options object"])
```
* date_histogram

interval: string using a [time unit](https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units)
```javascript
ES.agg.date_histogram("aggregation name")("field to aggregate on","interval")
```

* average

```javascript
ES.agg.average("aggregation name")("field to aggregate on")
```

NOTE: Aggregations below do not support sub aggregations. Error will be thrown.

* cardinality

```javascript
ES.agg.cardinality("aggregation name")("field to aggregate on")
```

* extended_stats

```javascript
ES.agg.extended_stats("aggregation name")("field to aggregate on")
```

* maximum

```javascript
ES.agg.maximum("aggregation name")("field to aggregate on")
```

* minimum

```javascript
ES.agg.minimum("aggregation name")("field to aggregate on")
```

* sum

```javascript
ES.agg.sum("aggregation name")("field to aggregate on")
```

* value_count

```javascript
ES.agg.value_count("aggregation name")("field to aggregate on")
```

#### Other options

```javascript

// will retrieve 1000 results maximum
// all queries with a size over 500 will be converted into a scroll.
q.size(1000)

// will retrieve the documents values for specific keys
q.fields(["name","id"])

// will change/retrieve the type
q.type("type1")

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
