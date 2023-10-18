# elasticsearch-helper [![npm version](https://badge.fury.io/js/elasticsearch-helper.svg)](https://badge.fury.io/js/elasticsearch-helper)

A Nodejs module facilitating querying Elasticsearch clusters.

# table of contents

-   [disclaimer](#disclaimer)
-   [installation](#installation)
-   [usage](#usage)
    -   [Add client](#add-client)
    -   [Global functions](#global-functions)
    -   [Use client](#use-client)
    -   [Error handling](#error-handling)
    -   [Index operations (.index())](#indexes)
        -   [mappings](#mappings)
        -   [copyTo](#copyto)
        -   [delete](#deleteindex)
        -   [exists](#exists)
        -   [touch](#touch)
    -   [Documents](#documents)
        -   [Single Document](#single-document)
            -   [Retrieve](#retrieve)
            -   [Delete](#delete)
            -   [Create/Overwrite](#createoverwrite)
            -   [Update](#update)
            -   [Upsert](#upsert)
        -   [Multiple Documents](#multiple-documents)
            -   [Types & search options](#types--search-options)
                -   [Filter types](#filter-types)
                -   [Search types](#search-types)
            -   [Retrieve](#retrieve-1)
            -   [Delete](#delete-1)
            -   [Count](#count)
            -   [aggregations \[BETA\]](#aggregations-beta)
                -   [Aggregation types](#aggregation-types)
            -   [Other options](#other-options)
    -   [Examples](#examples)
        -   [Query](#query)
        -   [Query with aggregation](#query-with-aggregation)

# disclaimer

After experiencing a lot of issues due to the way Elasticsearch handles the queries, I decided to create this helper currently used on production level that had helped us to drastically improve the readability and flexibility of our code.

With this helper you will be able to query your Elasticsearch clusters very easily. Everything is chainable and the query always returns a promise.

**Even if we use this on production level, we still find bugs and add improvements to the module codebase. Feel free to fork it and modify it for your own needs.**

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

## Global functions

```javascript
// Return an array of all indexes in a cluster
ES.indexes("[Client name]")
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

## Error handling

A method can be created to handle errors (like logging or formatting), This error method is part of a Promise and should return something if it needs to keep processing.

**Errors are always processed as Promise rejection**

```javascript
// Global error handling for all queries
ES.onError(err => {
  console.log("This message will appear after every error")
  return err;
})

// Query specific error handling
ES.query("Index1","Type1")
.onError(err => {
  //This onError will overwrite the global onError method for this query.
  console.log("This message will appear after this query has an error")
  return err;
})
```

## Events

Listeners can be added for specific events. 

### onUpserted

This event will trigger every time a data has updated or created on specific indexes. 

**If the 2nd argument is left empty it will check every index.**

```javascript
ES.onUpserted((indexName, typeName, documentId) => {
}, [/*Indexes to listen on*/])

// Query specific event handling
ES.query("Index1","Type1")
.onUpserted((indexName, typeName, documentId) => {
  //This event will NOT overwrite any global event.
})
```

### onDocumentChanged

This event will trigger every time a data has an effective change on specific indexes. 

**If the 2nd argument is left empty it will check every index.**

**This event creates 2 queries (1 for before retreiving the document and 1 after the doc is inserted) to check if the document has an actual change**

```javascript
ES.onDocumentChanged((beforeValue, afterValue) => {
}, [/*Indexes to listen on*/])

// Query specific event handling
ES.query("Index1","Type1")
.onDocumentChanged((beforeValue, afterValue) => {
  //This event will NOT overwrite any global event.
})
```

## Indexes

**All index operations are under the index() method to avoid conflicts**

**All methods return a promise.**

We implemented some helpers based on what we were using a lot.

New ones will be added over time.

### mappings

Return mappings for specific index(es)

```javascript
//Retrieve mappings of index1
ES.query("Index1")
.index()
.mappings()

//Backward compatibility
ES.query("Index1")
.mappings()
```

### copyTo

Easily copy an index/type to another client/index/type using bulk inserts.

NOTE1: you can copy based on a query, check below to see how to do queries.

NOTE2: If you want to copy millions of rows remember to set `size()`
, Elasticsearch-helper will create a scroll.

```javascript
//Copy from index1 to index2
ES.query("Index1")
.index()
.copyTo(ES.query("Index2"));

//Copy from index1 to index2 on client2
ES.query("Index1")
.index()
.copyTo(ES.query("Index2").use("client2"));

//Copy from index1, type1 to index2, type1
ES.query("Index1","Type1")
.index()
.copyTo(ES.query("Index2"));

//Copy from index1, type1 to index2, type2
ES.query("Index1","Type1")
.index()
.copyTo(ES.query("Index2","Type2"));

//Copy documents with first name is Josh from index1 to index2
ES.query("Index1")
.must(
  ES.type.term("first_name","Josh"),
)
.index()
.copyTo(ES.query("Index2"));

//Backward compatibility
ES.query("Index1")
.copyTo(ES.query("Index2","Type2"));
```

### delete

Delete an index

WARNING: This operation is final and cannot be reverted unless you have a snapshot, use at you own risk.

**For security reason you cannot delete multiple indexes at the same time.**

```javascript
//Delete index1
ES.query("Index1")
.index()
.delete();

//Delete index1 from client2
ES.query("Index1")
.use("client2")
.index()
.delete();

//Backward compatibility
ES.query("Index1")
.deleteIndex();
```

### exists

Check if an index exists.

```javascript
ES.query("Index1")
.index()
.exists();

ES.query("Index1")
.use("client2")
.index()
.exists();

//Backward compatibility
ES.query("Index1")
.exists();
```

### touch

Create an empty index without any mappings

```javascript
ES.query("Index1","data")
.index()
.touch();

ES.query("Index1","data")
.use("client2")
.index()
.touch();
```

### storeDocumentHistory

This will automatically store a version of a document into an index. 

**The document body stored is stringified**

```javascript
//historicalIndexName can be omitted. It will by default store into "historical_data"

//If the first argument is empty, it will store for all Indexes.
ES.storeDocumentHistory([/*List of indexes to keep historical data*/], historicalIndexName)

```

## Documents

Doing query:

For those example we will use the query variable 'q':

```javascript
// initialise query
const q = ES.query("Index1","Type1");
```

### Single Document

#### Retrieve
Retrieve a document with id 'ID'. Returns false if not found.

```javascript
q.id("ID")
 .run()
  .then(hit => {
  // returns hit object or false if not found
  console.log(hit.id())     // get Document ID
  console.log(hit.index())  // get Document index
  console.log(hit.type())   // get Document type
  console.log(hit.data())   // get Document source
  console.log(hit.source()) // get Document source (alias)
})
```

#### Delete
Delete document. Cannot be reversed.

```javascript
q.id("ID")
 .delete()
  .then(success => {
  // return true
})
```

#### Create/Overwrite
Overwrite the document if 'ID' exists. Create a new document otherwise.

```javascript
q.id("ID")
 .body({...}) // Data object to store
 .run()
  .then(hit => {
  // return the data object
})
```

#### Update
Update the document if it exists. Will return an error otherwise.

```javascript
q.id("ID")
 .update({...}) // Data object to update
 .run()
  .then(hit => {
  // return the data object
})
```

#### Upsert
Update the document if it exists. Will create a new document with 'ID' other wise.

```javascript
q.id("ID")
 .upsert({...}) // Data object to upsert
 .run()
  .then(hit => {
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

-   must

```javascript
  ES.filter.must(/* search types as arguments */);
```

-   must_not

```javascript
  ES.filter.must_not(/* search types as arguments */);
```

-   should

```javascript
  ES.filter.should(/* search types as arguments */);
```

-   filter

```javascript
  ES.filter.filter(/* search types as arguments */);
```

##### Search types

NOTE: not all types are currently implemented. Others will be added over time.

-   term

```javascript
  ES.type.term("fieldkey","fieldvalue");
  // ex:
  ES.type.term("name.first_name","josh");
```

-   terms

```javascript
  ES.type.terms("fieldkey","fieldvalues as array");
  // ex:
  ES.type.terms("name.first_name",["josh","alan","jack"]);
```

-   exists

```javascript
  ES.type.exists("fieldkey");
  // ex:
  ES.type.exists("name.first_name");
```

-   range

```javascript
  ES.type.range("fieldkey","range object options");
  // ex:
  ES.type.range("age",{
    gte: 10,
    lte: 30
  });
```

-   wildcard

```javascript
  ES.type.wildcard("fieldkey","fieldvalue");
  // ex:
  ES.type.wildcard("name.first_name","josh*");
```

-   prefix

```javascript
  ES.type.prefix("fieldkey","fieldvalue");
  // ex:
  ES.type.prefix("name.first_name","josh");
```

-   query string

More info: <https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html>

```javascript
  ES.type.query_string("text to search" [,"option object"]);
  // ex:
  ES.type.query_string("*jabba*",{
    "fields": [ "field1" ],
    "analyze_wildcard": true
  });
```

-   nested

Nested is an advanced feature of Elasticsearch allowing to do queries on sub-documents such as an array of objects. This type require that a specific mapping being setup. For more information: <https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-nested-query.html>

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

-   geo distance

Geo distance is an advanced feature that require a specific mapping in your index. For more information:
 <https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-geo-distance-query.html>

Geo distance requires a few parameters:

-   The starting point as a latiturde & longitude
-   The distance around this point - <https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#distance-units>
-   The type of calculation to apply - `arc` or `planar` (`arc` default)

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
).run()
.then(hits => {
  const total  = hits.total //get the total number of documents matching the query
  const length = hits.length //get the total number of documents returned by the query
  // return array of hits objects
  const hit = hits[0];
  console.log(hit.id()) // get Document ID
  console.log(hit.index()) // get Document index
  console.log(hit.type()) // get Document type
  console.log(hit.data()) // get Document source
  console.log(hit.source()) // get Document source (alias)
})
```

#### Delete

Delete by query is only available on Elasticsearch 5.X and over

```javascript
q.must(
  // Types
).delete()
.then(success => {
  // return true
})
```

#### Count

Count the documents

```javascript
q.must(
  // Types
).count()
.then(count => {
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
)
.run()
.then(response => {
  // retrieve the "created_date" aggregation
  const arrayAggList = response.agg("created_date")
  const arrayValues = arrayAggList.values() // return an array of values objects. array types values will depend on the aggregation type

  const firstValue = arrayValues[0];
  const valueID = firstValue.id(); // key of the value. If it is a date_histogram type it will be a moment object
  const valueData = firstValue.data(); // value of the aggregation for this key.


  // To retrieve a child aggregation:
  // Note: Each parent aggregation value has its own aggregation so you will have to loop through to get the child aggregation

  const arrayChildAggList = arrayAggList.agg("first_name");
  for(let parentKeyvalue in arrayChildAggList){
    arrayChildAggList[parentKeyvalue].values().forEach(value => {
      console.log(parentKeyvalue, value.id(),value.data());
    })
  }

})
```

##### Aggregation types

-   terms

```javascript
ES.agg.terms("aggregation name")("field to aggregate on"[,"options object"])
```

-   date_histogram

interval: string using a [time unit](https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units)

```javascript
ES.agg.date_histogram("aggregation name")("field to aggregate on","interval")
```

-   average

```javascript
ES.agg.average("aggregation name")("field to aggregate on")
```

NOTE: Aggregations below do not support sub aggregations. Error will be thrown.

-   cardinality

```javascript
ES.agg.cardinality("aggregation name")("field to aggregate on")
```

-   extended_stats

```javascript
ES.agg.extended_stats("aggregation name")("field to aggregate on")
```

-   maximum

```javascript
ES.agg.maximum("aggregation name")("field to aggregate on")
```

-   minimum

```javascript
ES.agg.minimum("aggregation name")("field to aggregate on")
```

-   sum

```javascript
ES.agg.sum("aggregation name")("field to aggregate on")
```

-   value_count

```javascript
ES.agg.value_count("aggregation name")("field to aggregate on")
```

#### Other options

-   size

```javascript
// will retrieve 1000 results maximum
// all queries with a size over 500 will be converted into a scroll.
q.size(1000)
```

-   from

```javascript
// Works with size
// will retrieve results from index 10
q.from(10)
```

-   fields

```javascript
q.fields(["name","id"])
```

-   type

```javascript
// will change/retrieve the type
q.type("type1")
```

-   sorting

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
  ES.type.term("name","John"),
  ES.type.terms("lastname",["Smith","Wake"])
)
.must_not(
  ES.type.range("age",{
    lte:20,
    gte:30
  })
)
.run()
.then(hits => {
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
.then(response => {
  // retrieve the "created_date" aggregation
  const arrayAggList = response.agg("created_date")
  const arrayValues = arrayAggList.values() // return an array of values objects. array types values will depend on the aggregation type

  const firstValue = arrayValues[0];
  const valueID = firstValue.id(); // key of the value. If it is a date_histogram type it will be a moment object
  const valueData = firstValue.data(); // value of the aggregation for this key.


  // To retrieve a child aggregation:
  // Note: Each parent aggregation value has its own aggregation so you will have to loop through to get the child aggregation
  const arrayChildAggList = arrayAggList.agg("first_name");
  for(let parentKeyvalue in arrayChildAggList){
    arrayChildAggList[parentKeyvalue].values().forEach(value => {
      console.log(parentKeyvalue, value.id(),value.data());
    })
  }
}).catch(err => {
  // error
  console.log(err)
})
```
