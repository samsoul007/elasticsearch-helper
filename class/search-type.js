'use strict'

var QueryBuilder = require("./query-builder")


var SearchType = function(){
  this.sKey = false;
  this.uValue = false;
  this.sType = false;
}

SearchType.prototype = {
  _setValues : function(p_sType,p_sKey,p_sValue){
    this.sKey = p_sKey;
    this.uValue = p_sValue;
    this.sType = p_sType;
  },
  term : function(p_sKey,p_sValue){
    if(p_sValue.constructor === Array)
      throw "cannot to be an array, use terms";

    this._setValues("term",p_sKey,p_sValue)
    return this;
  },
  exists: function(p_sKey){
    this._setValues("exists","field",p_sKey)
    return this;
  },
  range: function(p_sKey,p_oRange){
    this._setValues("range",p_sKey,p_oRange)
    return this;
  },
  terms : function(p_sKey,p_arrsValue){
    if(p_arrsValue.constructor !== Array)
      throw "needs to be an array";

    this._setValues("terms",p_sKey,p_arrsValue)
    return this;
  },
  wildcard: function(p_sKey,p_sValue){
    this._setValues("wildcard",p_sKey,p_sValue)
    return this;
  },
  prefix: function(p_sKey,p_sValue){
    this._setValues("prefix",p_sKey,p_sValue)
    return this;
  },
  nested: function(p_sKey,oQB){
    this._setValues("nested",p_sKey,oQB)

    return this;
  },
  render: function(){
    var oObj = {}
    if(this.sType == "nested"){
      oObj[this.sType] = {
        path : this.sKey,
        query: this.uValue.render()
      };
    }else{
      oObj[this.sType] = {};
      oObj[this.sType][this.sKey] = this.uValue;
    }

    return oObj;
  }
}

module.exports = SearchType;
