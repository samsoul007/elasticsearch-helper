'use strict'

var ConditionBuilder = require("./query-builder")

var QueryBuilder = function(){
   this.arroConditions = {};
}

QueryBuilder.prototype = {
  _add: function(CB,values){
    if(this.arroConditions[CB.getName()])
      throw "you can only have one "+CB.getName()+" condition";

    for(var key in values){
      CB.add(values[key]);
    }

    this.arroConditions[CB.getName()] = CB;
    return this;
  },
  must: function(){
    var oCB = new ConditionBuilder("must");
    return this._add(oCB,arguments);
  },
  must_not: function(){
    var oCB = new ConditionBuilder("must_not");
    return this._add(oCB,arguments);
  },
  should: function(){
    var oCB = new ConditionBuilder("should");
    return this._add(oCB,arguments);
  },
  filter: function(){
    var oCB = new ConditionBuilder("filter");
    return this._add(oCB,arguments);
  },
  render: function(){
    var self = this;
    return {
      "bool": (function(){
        var oReturn = {};
        for( var key in self.arroConditions){
          var oData = self.arroConditions[key].render()
          oReturn[oData.name] = oData.conditions;
        }
        return oReturn;
      })()
    }
  }
}

module.exports = QueryBuilder;
