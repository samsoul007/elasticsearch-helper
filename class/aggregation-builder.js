'use strict'

var AggregationBuilder = function(){
   this.oAggregations = {};
}

AggregationBuilder.prototype = {
  getByName : function(p_sName){
    return this.oAggregations[p_sName] || false;
  },
  count: function(){
    var i = 0;
    for(var key in this.oAggregations){
      i++;
    }

    return i;
  },
  _add: function(values){
    for(var key in values){
      var oAgg = values[key];
      if(this.oAggregations[oAgg.getName()])
        throw "you can only have one "+oAgg.getName()+" aggregation";

      this.oAggregations[oAgg.getName()]=oAgg;
    }
    return this;
  },
  add: function(){
    return this._add(arguments);
  },
  render: function(){
    var self = this;
    var oReturn = {};
    for( var key in self.oAggregations){
      oReturn[key] =  self.oAggregations[key].render();
    }
    return oReturn;
  }
}

module.exports = AggregationBuilder
