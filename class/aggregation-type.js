'use strict'

var AggregationBuilder = require("./aggregation-builder")

var AggregationType = function(p_sName){
  this.sName = p_sName;
  this.sType = false;
  this.acceptSubAgg = true;
  this.oOptions = {};
  this.oAB = new AggregationBuilder();
}

AggregationType.prototype = {
  getName: function(){
    return this.sName;
  },
  getType: function(){
    return this.sType;
  },

  average: function(p_sKey){
      this.sType = "avg";
      this.acceptSubAgg = false;

      this.oOptions = {
        "field" : p_sKey
      }

      return this;
  },
  cardinality: function(p_sKey){
      this.sType = "cardinality";
      this.acceptSubAgg = false;

      this.oOptions = {
        "field" : p_sKey
      }

      return this;
  },
  extended_stats: function(p_sKey){
      this.sType = "extended_stats";
      this.acceptSubAgg = false;

      this.oOptions = {
        "field" : p_sKey
      }

      return this;
  },
  maximum: function(p_sKey){
      this.sType = "max";
      this.acceptSubAgg = false;

      this.oOptions = {
        "field" : p_sKey
      }

      return this;
  },
  minimum: function(p_sKey){
      this.sType = "min";
      this.acceptSubAgg = false;

      this.oOptions = {
        "field" : p_sKey
      }

      return this;
  },
  sum: function(p_sKey){
      this.sType = "sum";
      this.acceptSubAgg = false;

      this.oOptions = {
        "field" : p_sKey
      }

      return this;
  },
  value_count: function(p_sKey){
      this.sType = "value_count";
      this.acceptSubAgg = false;

      this.oOptions = {
        "field" : p_sKey
      }

      return this;
  },

  terms : function(p_sKey,p_oOptions){
    this.sType = "terms";

    this.oOptions = {
      "field" : p_sKey
    }

    if(p_oOptions){
      for (var attrname in p_oOptions) { this.oOptions[attrname] = p_oOptions[attrname]; }
    }

    return this;
  },
  date_histogram : function(p_sKey,p_sInterval){
    this.sType = "date_histogram";

    this.oOptions = {
      "field" : p_sKey,
      "interval": p_sInterval
    }

    return this;
  },
  aggs: function(){
    if(!arguments.length)
      return this.oAB;

    if(this.acceptSubAgg == false)
      throw this.sType+" does not support sub-aggregations"

    this.oAB.add.apply(this.oAB,arguments)
    return this;
  },
  render: function(){
    var oObj = {
      [this.sType]: this.oOptions
    }

    if(this.oAB.count())
      oObj.aggs = this.oAB.render();

    return oObj;
  }
}

module.exports = AggregationType;
