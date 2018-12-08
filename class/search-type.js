'use strict'

var QueryBuilder = require("./query-builder")


var SearchType = function(){
  this.sKey = false;
  this.uValue = false;
  this.sType = false;
}

SearchType.prototype = {
  _setValues : function(p_sType,p_sKey,p_uValue){
    this.sKey = p_sKey;
    this.uValue = p_uValue;
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
  geo: function(p_sKey,p_oPoint,p_sDistance,p_sDistanceType){
    if(p_sDistanceType && (p_sDistanceType !== "arc" || p_sDistanceType !== "plane"))
      throw "Distance type needs to be 'arc' or 'plane'";

    this._setValues("geo_distance",p_sKey,{
      distance: p_sDistance,
      type: p_sDistanceType,
      point: p_oPoint
    })
    return this;
  },
  render: function(){
    var oObj = {}

    switch(this.sType){
      case "geo_distance":
        oObj[this.sType] = {
          "distance" : this.uValue.distance,
          [this.sKey] : this.uValue.point
        }

        if(this.uValue.type){
          oObj[this.sType].distance_type = this.uValue.type
        }
      break;
      case "nested":
        oObj[this.sType] = {
          path : this.sKey,
          query: this.uValue.render()
        };
      break;
      default:
        oObj[this.sType] = {};
        oObj[this.sType][this.sKey] = this.uValue;
      break;
    }

    return oObj;
  }
}

module.exports = SearchType;
