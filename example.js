const ES = require("./index")

/**
 * Create a client based on a host
 * @param {string} name optional
 * @param {string} host ip:port
 */
ES.AddClient("client name","cliend ip:port");


//ID functions

//Retrieve a specific ID
ES.query("index","type")
.id("123")
.run().then(function(hit){
  //hit object or false
}).catch(function(err){
  //error
})

//Overwrite a specific ID
ES.query("index","type")
.id("123")
.body({...}) //Contains the data
.run().then(function(body){
  //body object
}).catch(function(err){
  //error
})

//Update a specific ID
ES.query("index","type")
.id("123")
.update({...}) //Contains the data to be updated
.run().then(function(body){
  //body object
}).catch(function(err){
  //error
})

//Query functions
