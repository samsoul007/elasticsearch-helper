'use strict'

var AggregationBuilder = require("./aggregation-builder")

var AggregationType = function(p_sName){
  this.sName = p_sName;
  this.sType = false;
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
  terms : function(p_sKey){
    this.sType = "terms";

    this.oOptions = {
      "field" : p_sKey
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
