'use strict';

var promise = require("bluebird");
var ES = require("elasticsearch");
var moment = require("moment");
var ElasticsearchScrollStream = require('elasticsearch-scroll-stream');


// var oESClient = false;
var oESClientList = {};

var sDefaultName = "default";


/**
 * Create a client
 * @method AddClient with 3 arguments
 * @param {String} Name - name of the host (ex: 'myES')
 * @param {String} Host - host (ex: '127.0.0.1:9200')
 * @param {Boolean} Default - set this client as default for queries
 * @return {Void}
 *
 * @method AddClient with 1 arguments
 * @param {String} Host - host (ex: '127.0.0.1:9200')
 * @return {Void}
 */
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

    if(arguments[2] && arguments[2] == true)
      sDefaultName = sName;
  }

  oESClientList[sName] = new ES.Client({
    host: sHost,
    // log: 'trace'
  });
}

/**
 * Return a client
 * @method getClient
 * @param {String} Name - host (ex: 'myES')
 * @return {Object} Client or false if not found
 */
var getClient = function(){
  if(arguments.length == 0 && oESClientList[sDefaultName]){
      return oESClientList[sDefaultName];
  }else if(oESClientList[arguments[0]]){
      return oESClientList[arguments[0]]
  }else {
      return false;
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
  },
  agg: function(p_sName){
    if(!this.oResponse.aggregations || !this.oResponse.aggregations[p_sName])
      return false;

    return new Aggregation(this.oResponse.aggregations[p_sName],this.oResponse.aggregations.pattern.getByName(p_sName));
  }
}

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


var Elasticsearch = function(p_sIndex,p_sType){
  this.oESClient = false;

  this.sIndex = p_sIndex;
  this.sType = p_sType;
  this.sID = false;

  this.oQuery = {
    "query": {}
  }

  this.oBody = false;
  this.oDoc   = false;
  this.bDelete = false;
  this.bHasCondition = false;

  this.oQB = new QueryBuilder();
  this.oAB = new AggregationBuilder();
}

Elasticsearch.prototype = {
    must: function(){
      this.oQB.must.apply(this.oQB,arguments)
      return this;
    },
    should: function(){
      this.oQB.should.apply(this.oQB,arguments)
      return this;
    },
    filter: function(){
      this.oQB.filter.apply(this.oQB,arguments)
      return this;
    },
    must_not: function(){
      this.oQB.must_not.apply(this.oQB,arguments)
      return this;
    },
    log: function(){
      console.log(JSON.stringify({
        query: this.oQB.render(),
        aggs: this.oAB.render()
      },null,2));

      return this;
    },
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
    aggs: function(){
      this.oAB.add.apply(this.oAB,arguments)
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

            oQuery.body = {
              query: self.oQB.render()
            };

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
          oQuery.body = {
            query: self.oQB.render()
          };

          if(self.oQuery.size) oQuery.body.size = self.oQuery.size;
          if(self.oQuery._source) oQuery.body._source = self.oQuery._source;
        }



        //if size is more than 500 we do an automatic scroll
        if(self.oQuery.size && self.oQuery.size > 500 && !self.oAB.count()){
          var arroData = [];

          oQuery.scroll = "1m";

          var es_stream = new ElasticsearchScrollStream(self.oESClient, oQuery, ['_id', '_index','_type']);

          es_stream.on('data',function(data){
            var current_doc = JSON.parse(data.toString());

            var _id = current_doc._id;
            var _index = current_doc._index;
            var _type = current_doc._type;

            delete current_doc._id;
            delete current_doc._index;
            delete current_doc._type;

            arroData.push({
              _id: _id,
              _index: _index,
              _type: _type,
              _source: current_doc
            });
          });

          es_stream.on('end', function() {
            var response = {
                hits: {
                   total : arroData.length,
                   hits: arroData
               }
            }

            resolve((new Response(response)).results());
          });

          es_stream.on('error', function(err) {
            reject(err);
          });
        }else{
          if(sType=="search" && self.oAB.count()){
            oQuery.body.size = 0 ;
            oQuery.body.aggs = self.oAB.render();
          }

          // console.log(JSON.stringify(oQuery,null,2))

          self.oESClient[sType](oQuery,function(err,response){
            if(err){
              if(err.status == 404){
                return resolve(false);
              }else{
                return reject(err)
              }
            }



            if(sType=="search"){
              if(response.aggregations){
                response.aggregations.pattern = self.oAB;
                return resolve(new Response(response))
              }

              return resolve((new Response(response)).results())
            }else if(sType=="get"){
              return resolve((new Response(response)).result())
            }else{
              return resolve(self.oBody || self.oDoc || self.bDelete);
            }
          })
        }
      });
    }
}

module.exports = {
  AddClient : AddClient,
  getClient:getClient,
  Query : function(p_sIndex,p_sType){
    return new Elasticsearch(p_sIndex,p_sType)
  },
  addType: function(){
    return new SearchType();
  },
  addFilter: function(){
    return new QueryBuilder();
  },
  filter: {
    should: function(){
      var oQB = new QueryBuilder();
      return oQB.should.apply(oQB,arguments);
    },
    must: function(){
      var oQB = new QueryBuilder();
      return oQB.must.apply(oQB,arguments);
    },
    filter: function(){
      var oQB = new QueryBuilder();
      return oQB.filter.apply(oQB,arguments);
    },
    must_not: function(){
      var oQB = new QueryBuilder();
      return oQB.must_not.apply(oQB,arguments);
    }
  },
  type:{
    term: function(){
      var oST = new SearchType();
      return oST.term.apply(oST,arguments);
    },
    terms: function(){
      var oST = new SearchType();
      return oST.terms.apply(oST,arguments);
    },
    exists: function(){
      var oST = new SearchType();
      return oST.exists.apply(oST,arguments);
    },
    range: function(){
      var oST = new SearchType();
      return oST.range.apply(oST,arguments);
    }
  },
  agg:{
    terms: function(p_sName){
      return function(){
        var oST = new AggregationType(p_sName);
        return oST.terms.apply(oST,arguments);
      }
    },
    date_histogram: function(p_sName){
      return function(){
        var oST = new AggregationType(p_sName);
        return oST.date_histogram.apply(oST,arguments);
      }
    }
  }
}
