'use strict'

var Hit = function(p_oHit){
  this.oHit = p_oHit
}

Hit.prototype = {
  id : function(){
    return this.oHit._id;
  },
  data: function(){
    return this.oHit._source;
  },
  index: function(){
    return this.oHit._index;
  },
  type: function(){
    return this.oHit._type;
  }
}

module.exports = Hit;
