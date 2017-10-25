'use strict'

var ConditionBuilder = function(p_sName){
  this.arroConditions = [];
  this.conditionName = p_sName;
}

ConditionBuilder.prototype = {
  getName : function(){
    return this.conditionName;
  },
  add : function(p_oType){
    this.arroConditions.push(p_oType);
    return this;
  },
  render: function(){
    return {
      name: this.conditionName,
      conditions: this.arroConditions.map(function(o){return o.render()})
    }
  }
}

module.exports = ConditionBuilder;
