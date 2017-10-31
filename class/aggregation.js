'use strict';

var moment = require("moment");
var Hit = require("./hit")
var Aggregation = require("./aggregation")

var Aggregation = function(p_oAggregation,p_oPattern){
  this.oAggregation = p_oAggregation;
  this.oPattern = p_oPattern;
}

Aggregation.prototype = {
  values: function(){
    switch(this.oPattern.getType()){
      case "terms":
        return this.oAggregation.buckets.map(function(value){
          return new Hit({
            _id: value.key,
            _source : value.doc_count
          })
        })
      break;
      case "date_histogram":
      return this.oAggregation.buckets.map(function(value){
        return new Hit({
          _id: new moment(value.key),
          _source : value.doc_count
        })
      })
      break;
      case "avg":
      case "cardinality":
      case "max":
      case "min":
      case "sum":
      case "value_count":
      return new Hit({
        _id: "",
        _source : this.oAggregation.value
      })
      break;
      case "extended_stats":
      return new Hit({
        _id: "",
        _source : this.oAggregation
      })
      break;
    }
  },
  agg: function(p_sName){
    var self = this;
    return self.oAggregation.buckets.reduce(function(obj,value){
      if(value[p_sName])
        obj[value.key] = new Aggregation(value[p_sName],self.oPattern.aggs().getByName(p_sName));
      return obj
    },{})
  }
}

module.exports = Aggregation
