'use strict'

var Hit = require("./hit")
var Aggregation = require("./aggregation")

var Response = function(p_oResponse){
  this.oResponse = p_oResponse;
}

Response.prototype = {
  count : function(){
    if(!this.oResponse.hits)
      return Promise.resolve(this.oResponse.found?1:0);

    return Promise.resolve(this.oResponse.hits.total);
  },
  result: function(){
    if(this.oResponse.found){
      return Promise.resolve(new Hit(this.oResponse))
    }else{
      return Promise.resolve(false)
    }
  },
  results: function(){
    return Promise.resolve(this.oResponse.hits.hits.map(function(o){return new Hit(o)}))
  },
  agg: function(p_sName){
    if(!this.oResponse.aggregations || !this.oResponse.aggregations[p_sName])
      return false;

    return new Aggregation(this.oResponse.aggregations[p_sName],this.oResponse.aggregations.pattern.getByName(p_sName));
  }
}

module.exports = Response;
