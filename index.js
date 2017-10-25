'use strict';

var ES = require("elasticsearch");
var ElasticsearchScrollStream = require('elasticsearch-scroll-stream');

var Response = require("./class/response")
var QueryBuilder = require("./class/query-builder")
var ConditionBuilder = require("./class/query-builder")
var AggregationBuilder = require("./class/aggregation-builder")
var SearchType = require("./class/search-type")
var AggregationType = require("./class/aggregation-type")

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
