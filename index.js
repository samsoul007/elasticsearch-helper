var promise = require("bluebird");
var ES = require("elasticsearch");

// var oESClient = false;
var oESClientList = {};

var AddClient = function(){
  var sName = "default";
  var sHost = false;

  if(arguments.length == 1){
    if(oESClientList["default"])
      return;

    sHost = arguments[0];

  }else{
    if(oESClientList[arguments[0]])
      return;

    sName = arguments[0];
    sHost = arguments[1];
  }

  oESClientList[sName] = new ES.Client({
    host: sHost,
    // log: 'trace'
  });
}

var getClient = function(){
  var sName = "default";

  if(arguments.length == 0){
    if(oESClientList["default"])
      return oESClientList["default"];
  }else{
    if(oESClientList[arguments[0]])
      return oESClientList[arguments[0]]
  }
}

var Response = function(p_oResponse){
  this.oResponse = p_oResponse;
}

Response.prototype = {
  count : function(){
    if(!this.oResponse.hits)
      return promise.resolve(this.oResponse.found?1:0);

    return promise.resolve(this.oResponse.hits.total);
  },
  result: function(){
    if(this.oResponse.found){
      return promise.resolve(new Hit(this.oResponse))
    }else{
      return promise.resolve(false)
    }
  },
  results: function(){
    return promise.resolve(this.oResponse.hits.hits.map(function(o){return new Hit(o)}))
  }
}

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

    this._setValues("terms",p_sKey,p_sValue)
    return this;
  },
  render: function(){
    var oObj = {}
    oObj[this.sType] = {};
    oObj[this.sType][this.sKey] = this.uValue;
    return oObj;
  }
}

var Elasticsearch = function(p_sIndex,p_sType){
  this.oESClient = false;

  this.sIndex = p_sIndex;
  this.sType = p_sType;
  this.sID = false;

  this.oQuery = {
    "query": {
      "bool": {}
    }
  }

  this.oBody = false;
  this.oDoc   = false;
  this.bDelete = false;
  this.bHasCondition = false;
}

var addType =  function(){
  return new SearchType();
}

Elasticsearch.prototype = {
    use: function(p_sClientName){
      if(!oESClientList[p_sClientName])
        throw "client with name "+p_sClientName+" doesn't exists";

      this.oESClient = oESClientList[p_sClientName];
      return this;
    },
    size : function(p_iSize){
      this.oQuery.size = p_iSize;
      return this;
    },
    fields : function(p_arroFields){
      this.oQuery._source = p_arroFields;
      return this;
    },
    id: function(p_sID){
      this.sID = p_sID;
      return this;
    },
    body: function(p_oBody){
      this.oBody = p_oBody;
      return this;
    },
    update: function(p_oData){
      this.oDoc = p_oData
      return this;
    },
    must: function(){
      for(var i  = 0 ; i < arguments.length; i++){
        this._addCondition("must",arguments[i]);
      }
      return this;
    },
    should: function(){
      for(var i  = 0 ; i < arguments.length; i++){
        this._addCondition("should",arguments[i]);
      }
      return this;
    },
    filter: function(){
      for(var i  = 0 ; i < arguments.length; i++){
        this._addCondition("filter",arguments[i]);
      }
      return this;
    },
    must_not: function(){
      for(var i  = 0 ; i < arguments.length; i++){
        this._addCondition("must_not",arguments[i]);
      }

     return this;
    },
    _addCondition: function(p_sType,p_oType){
      if(!this.oQuery.query.bool[p_sType]) this.oQuery.query.bool[p_sType] = [];
      this.oQuery.query.bool[p_sType].push(p_oType.render());
      this.bHasCondition = true;
    },
    agg: function(p_oType,p_sParent){
      if(!this.oQuery.aggs) this.oQuery.aggs = {};
      this.oQuery.aggs[p_oType.getName()] = p_oType.render();
      return this;
    },
    delete:function(){
      this.bDelete = true;
      return this.run();
    },
    run: function(){
      this.oESClient = this.oESClient || oESClientList["default"];

      if(!this.oESClient){
        throw "need to setup the elasticsearch client";
      }

      var self = this;
      return new Promise(function(resolve, reject) {
        var sType = "search";
        var oQuery = {
          index : self.sIndex,
        }


        if(self.sType)
          oQuery.type= self.sType

        if(self.sID){
          if(!self.sType)
            return reject("You need to set a type to search or update by ID")

          oQuery.id = self.sID;
          sType = "get";
        }

        if(self.bDelete){
          if(self.sID)
            sType = "delete"
          else{
           if(!self.bHasCondition)
            return reject("You need a request body")

           oQuery.body = self.oQuery;
           sType = "deleteByQuery";
         }
        }else if(self.oDoc){
          if(!self.sID)
            return reject("You need to set an id to update")

          oQuery.body = {
            "doc": self.oDoc
          }

          sType = "update";
        }else if(self.oBody){
          if(!self.sID)
            return reject("You need to set an id to index")

          oQuery.body = self.oBody;
          sType = "index";
        }else if(!self.sID){
          oQuery.body = {};
          oQuery.body.query = self.oQuery.query;
          if(self.oQuery.size) oQuery.body.size = self.oQuery.size;
          if(self.oQuery._source) oQuery.body._source = self.oQuery._source;
        }

        self.oESClient[sType](oQuery,function(err,response){
          if(err){
            if(err.status == 404){
              return resolve(false);
            }else{
              return reject(err)
            }
          }

          if(sType=="search" || sType=="get")
            return resolve((new Response(response))[sType=="get"?"result":"results"]())
          else
            return resolve(self.oBody || self.oDoc || self.bDelete);
        })
      });
    }
}

module.exports = {
  AddClient : AddClient,
  getClient:getClient,
  Query : function(p_sIndex,p_sType){
    return new Elasticsearch(p_sIndex,p_sType)
  },
  addType:addType
}
