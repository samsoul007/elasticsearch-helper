const ES = require("./index")

/**
 * Create a client based on a host
 * @param {string} name optional
 * @param {string} host ip:port
 */
ES.AddClient("127.0.0.1:9200");


// Aggregation
ES.Query("user")
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
  console.log(response)
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
  console.log(err)
  //error
})

// //Overwrite a specific ID
// ES.query("index","type")
// .id("123")
// .body({...}) //Contains the data
// .run().then(function(body){
//   //body object
// }).catch(function(err){
//   //error
// })
//
// //Update a specific ID
// ES.query("index","type")
// .id("123")
// .update({...}) //Contains the data to be updated
// .run().then(function(body){
//   //body object
// }).catch(function(err){
//   //error
// })

//Query functions
