


# elasticsearch-helper [![npm version](https://badge.fury.io/js/elasticsearch-helper.svg)](https://badge.fury.io/js/elasticsearch-helper)

A Nodejs module facilitating querying Elasticsearch clusters.

<img src="https://static-www.elastic.co/assets/blteb1c97719574938d/logo-elastic-elasticsearch-lt.svg?q=294" width="200" />

# table of contents

* [disclaimer](#disclaimer)
* [installation](#installation)
* [usage](#usage)
   * [Add client](#add-client)
   * [Use client](#use-client)
   * [Indexes](#indexes)
      * [copyTo](#copyto)
      * [deleteIndex](#deleteindex)
      * [exists](#exists)
      * [error handling](#error-handling)
   * [Documents](#documents)
      * [Single Document](#single-document)
         * [Retrieve](#retrieve)
         * [Delete](#delete)
         * [Create/Overwrite](#createoverwrite)
         * [Update](#update)
         * [Upsert](#upsert)
      * [Multiple Documents](#multiple-documents)
         * [Types &amp; search options](#types--search-options)
            * [Filter types](#filter-types)
            * [Search types](#search-types)
         * [Retrieve](#retrieve-1)
         * [Delete](#delete-1)
         * [Count](#count)
         * [aggregations [BETA]](#aggregations-beta)
            * [Aggregation types](#aggregation-types)
         * [Other options](#other-options)
   * [Examples](#examples)
      * [Query](#query)
      * [Query with aggregation](#query-with-aggregation)


# disclaimer

After experiencing a lot of issues due to the way Elasticsearch handles the queries, I decided to create this helper currently used on production level that had helped us to drastically improve the readability and flexibility of our code.

With this helper you will be able to query your elasticsearch clusters very easily. Everything is chainable and the query always returns a promise.

NOTE: Even if we use this on production level, we still find bugs and add improvements to the module codebase. Feel free to fork it and modify it for your own needs.

# installation

`npm install --save elasticsearch-helper`

# usage


## Add client

```javascript
const ES = require("elasticsearch-helper")

// Will create a default client
ES.addClient("127.0.0.1:9200");

// Will create a client with name "client1"
ES.addClient("client1","127.0.0.1:9200");

// Will create a client with name "client1" and will be used as default
ES.addClient("client1","127.0.0.1:9200",true);

// Alias:
ES.AddClient(...)
```

## Use client

The client is chainable which means that you can call functions one after the other until you execute the query. The query is then returning a promise.

Initialise a query:

```javascript
// Querying on index "Index1"
ES.query("Index1");

// Querying on all indexes starting with "Index"
ES.query("Index*");

// Querying on index "Index1" and type "Type1"
ES.query("Index1","Type1");

// Querying on index "Index1" and type "Type1" using the client "Client1"
ES.query("Index1","Type1)".use("Client1")
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
ES.query("Index1")
.copyTo(ES.query("Index2"));

//Copy from index1 to index2 on client2
ES.query("Index1")
.copyTo(ES.query("Index2").use("client2"));

//Copy from index1, type1 to index2, type1
ES.query("Index1","Type1")
.copyTo(ES.query("Index2"));

//Copy from index1, type1 to index2, type2
ES.query("Index1","Type1")
.copyTo(ES.query("Index2","Type2"));

//Copy documents with first name is Josh from index1 to index2
ES.query("Index1")
.must(
  ES.type.term("first_name","Josh"),
)
.copyTo(ES.query("Index2"));
```

### deleteIndex

Delete an index

WARNING: This operation is final and cannot be reverted unless you have a snapshot, use at you own risk.

NOTE: For security reason you cannot delete multiple indexes at the same time.

```javascript

//Delete index1
ES.query("Index1")
.deleteIndex();

//Delete index1 from client2
ES.query("Index1")
.use("client2")
.deleteIndex();
```

### exists

Check if an index exists.

```javascript

ES.query("Index1")
.exists();

ES.query("Index1")
.use("client2")
.exists();
```

### error handling

A method can be created to handle errors (like logging or formatting), This error method is part of a Promise and should return something if it needs to keep processing.

**Errors are always processed as Promise rejection**

```javascript

// Global error handling for all queries
ES.onError(function(err){
  console.log("This message will appear after every error")
  return err;
})

// Query specific error handling
ES.query("Index1","Type1")
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
var q = ES.query("Index1","Type1");
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

#### Upsert

```javascript
q.id("ID")
 .upsert({...}) // Data object to upsert
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
  ES.type.term("fieldname","fieldvalue"),
  // Add a sub filter in the query
  ES.filter.should(
    ES.type.terms("fieldname2","fieldvalues")
  )
)
```
##### Filter types
* must

```javascript
  ES.filter.must(/* search types as arguments */);
```
* must_not

```javascript
  ES.filter.must_not(/* search types as arguments */);
```
* should

```javascript
  ES.filter.should(/* search types as arguments */);
```
* filter

```javascript
  ES.filter.filter(/* search types as arguments */);
```

##### Search types

NOTE: not all types are currently implemented. Others will be added over time.

* term

```javascript
  ES.type.term("fieldkey","fieldvalue");
  // ex:
  ES.type.term("name.first_name","josh");
```
* terms

```javascript
  ES.type.terms("fieldkey","fieldvalues as array");
  // ex:
  ES.type.terms("name.first_name",["josh","alan","jack"]);
```
* exists

```javascript
  ES.type.exists("fieldkey");
  // ex:
  ES.type.exists("name.first_name");
```
* range

```javascript
  ES.type.range("fieldkey","range object options");
  // ex:
  ES.type.range("age",{
    gte: 10,
    lte: 30
  });
```

* wildcard

```javascript
  ES.type.wildcard("fieldkey","fieldvalue");
  // ex:
  ES.type.wildcard("name.first_name","josh*");
```

* prefix

```javascript
  ES.type.prefix("fieldkey","fieldvalue");
  // ex:
  ES.type.prefix("name.first_name","josh");
```

* nested

Nested is an advanced feature of Elasticsearch allowing to do queries on sub-documents such as an array of objects. This type require that a specific mapping being setup. For more information: https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-nested-query.html

In nested query you always define the parent and the filters always prepend the parent name. All filters are available.

This type can be combined with other types at any level and/or create sub nested queries.

```javascript
  ES.type.nested("parent","filter object");
  // ex:
  ES.type.nested("name",ES.filter.must(
    ES.type.term("name.first", "josh"),
    ES.type.term("name.last", "wake")
  ));
```

* geo distance

Geo distance is an advanced feature that require a specific mapping in your index. For more information:
 https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-geo-distance-query.html

Geo distance requires a few parameters:
- The starting point as a latiturde & longitude
- The distance around this point - https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#distance-units
- The type of calculation to apply - `arc` or `planar` (`arc` default)

```javascript
  ES.type.geo("fieldkey","origin latlon","distance"[,"calculation"]);
  // ex:
  ES.type.geo("location.geo",{ "lat": 48,"lon": 2 },"120km"[,"arc"])
  //Note: latlon value can be set as string ('48,2') or as an array ([48,2])
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

* size

```javascript
// will retrieve 1000 results maximum
// all queries with a size over 500 will be converted into a scroll.
q.size(1000)
```

* from

```javascript
// Works with size
// will retrieve results from index 10
q.from(10)
```

* fields

```javascript
q.fields(["name","id"])
```

* type

```javascript
// will change/retrieve the type
q.type("type1")
```

* sorting

[Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html)
```javascript
q.sort([{ "post_date" : {"order" : "asc"}}, ...])

```

## Examples


#### Query
```javascript
const ES = require("elasticsearch-helper")

ES.AddClient("client1","127.0.0.1:9200");

ES.query("Index1","Type1")
.use("client1")
.size(10)
.must(
  ES.addType().term("name","John"),
  ES.addType().terms("lastname",["Smith","Wake"])
)
.must_not(
  ES.addType().range("age",{
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
const ES = require("elasticsearch-helper")

ES.AddClient("client1","127.0.0.1:9200");

ES.Query("user")
.size(1001) // when an aggregation is set, size is set to 0.
.must(
  ES.type.term("name","jacques"),
  ES.type.range("age",{gt:20,lte:40}),
  ES.filter.should(
    ES.type.term("color","blue"),
    ES.type.term("vehicle","car")
  )
)
.aggs(
  ES.agg.date_histogram("created_date")("date_created","1d")
    // Child aggregation to the "created_date" aggregation
    .aggs(
      ES.agg.terms("first_name")("data.first_name.raw")
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
