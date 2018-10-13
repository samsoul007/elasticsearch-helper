'use strict';

var ES = require("elasticsearch");
var ElasticsearchScrollStream = require('elasticsearch-scroll-stream');

var Response = require("./class/response")
var QueryBuilder = require("./class/query-builder")
var ConditionBuilder = require("./class/condition-builder")
var AggregationBuilder = require("./class/aggregation-builder")
var SearchType = require("./class/search-type")
var AggregationType = require("./class/aggregation-type")
var _ = require("lodash");
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
 * @method AddClient with 1 argument
 * @param {String} Host - host (ex: '127.0.0.1:9200')
 * @return {Void}
 */
var AddClient = function() {
  var sName = "default";
  var sHost = false;

  if (arguments.length == 1) {
    if (oESClientList["default"])
      return;

    sHost = arguments[0];

  } else {
    if (oESClientList[arguments[0]])
      return;

    sName = arguments[0];
    sHost = arguments[1];

    if (arguments[2] && arguments[2] == true)
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
var getClient = function() {
  if (arguments.length == 0 && oESClientList[sDefaultName]) {
    return oESClientList[sDefaultName];
  } else if (oESClientList[arguments[0]]) {
    return oESClientList[arguments[0]]
  } else {
    return false;
  }
}

var onErrorMethod = function(err){
  return err;
};

var promiseSerie = function(arroPromises) {
  var p = Promise.resolve();
  return arroPromises.reduce(function(pacc, fn) {
    return pacc = pacc.then(fn);
  }, p);
}

var Elasticsearch = function(p_sIndex, p_sType) {
  this.oESClient = false;

  this.sIndex = p_sIndex;
  this.sType = p_sType;
  this.sID = false;

  this.sizeResult = false;
  this.arrsFields = [];
  this.arroSorts = [];
  this.oBody = false;
  this.oDoc = false;
  this.bDelete = false;
  this.bEmptyIndex = false;
  this.bCount = false;
  this.bHasCondition = false;
  this.arroBulk = [];
  this.onErrorMethod = onErrorMethod;

  this.onPagination = false;
  this.iPageSize = 250;
  this.bUpsert = false

  this.oQB = new QueryBuilder();
  this.oAB = new AggregationBuilder();
}

Elasticsearch.prototype = {
  type: function(){
    if(!arguments.length)
      return this.sType

    this.sType = arguments[0];
    return this;
  },
  onError : function(p_fFunction){
    this.onErrorMethod = p_fFunction;
    return this;
  },
  onPagination: function(p_fFuntion,p_iSize){
    this.onPagination = p_fFuntion;
    this.iPageSize = p_iSize || this.iPageSize;
    return this;
  },
  _hasAggregation: function() {
    return this.oAB.count() ? true : false;
  },
  _getClient: function() {
    return this.oESClient || oESClientList["default"];
  },
  _generateQuery: function() {
    var self = this;

    return new Promise(function(resolve, reject) {
      var sType = "search";
      var oQuery = {
        index: self.sIndex,
      }

      if (self.sType)
        oQuery.type = self.sType

      //Dealing with bulk
      if (self.arroBulk.length) {
        if (self.sID) {
          return reject("You cannot use id() with bulk()")
        }

        oQuery.body = self.arroBulk;
        sType = "bulk";
      } else {
        if (self.sID) {
          if (!self.sType)
            return reject("You need to set a type to search or update by ID")

          oQuery.id = self.sID;
          sType = "get";
        }

        if (self.bDelete) {
          if (self.sID)
            sType = "delete"
          else {
            if (!self.bHasCondition)
              return reject("You need a request body")

            oQuery.body = {
              query: self.oQB.render()
            };

            sType = "deleteByQuery";
          }
        }else if(self.bEmptyIndex) {
          oQuery.body = {
            query: {
              "match_all":{}
            }
          };

          sType = "deleteByQuery";
        }else if (self.oDoc) {
          if (!self.sID)
            return reject("You need to set an id to update")

          oQuery.body = {
            "doc": self.oDoc
          }

          if(self.upsert)
            oQuery.body.doc_as_upsert = true;

          sType = "update";
        } else if (self.bCount) {
          oQuery.body = {
            query: self.oQB.render()
          };
          sType = "count";
        } else if (self.oBody) {
          if (!self.sID)
            return reject("You need to set an id to index")

          oQuery.body = self.oBody;
          sType = "index";
        } else if (!self.sID) {
          oQuery.body = {
            query: self.oQB.render()
          };

          oQuery.body.size = self.sizeResult || 10;
          oQuery.body._source = self.arrsFields;
          oQuery.body.sort = self.arroSorts;
        }

        if (sType == "search" && self.oAB.count()) {
          oQuery.body.size = 0;
          oQuery.body.aggs = self.oAB.render();
        }
      }

      resolve({
        type: sType,
        query: oQuery
      });
    })
  },

  must: function() {
    this.oQB.must.apply(this.oQB, arguments)
    this.bHasCondition = true;
    return this;
  },
  should: function() {
    this.oQB.should.apply(this.oQB, arguments)
    this.bHasCondition = true;
    return this;
  },
  filter: function() {
    this.oQB.filter.apply(this.oQB, arguments)
    this.bHasCondition = true;
    return this;
  },
  must_not: function() {
    this.oQB.must_not.apply(this.oQB, arguments)
    this.bHasCondition = true;
    return this;
  },
  deleteIndex: function() {
    if (this.sIndex.indexOf('*') !== -1 ||  this.sIndex.split(",").length > 1)
      throw "For security reasons you cannot delete multiple indexes";


    var self = this;
    return new Promise(function(resolve, reject) {
      self._getClient().indices.delete({
        index: self.sIndex
      }, function(err, response) {
        if (err) return reject(err);

        resolve(response.acknowledged)
      })
    })
  },
  empty: function(){
    this.bEmptyIndex = true;
    return this.run();
  },
  exists: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      self._getClient().indices.exists({
        index: self.sIndex
      }, function(err, response) {
        if (err) return reject(err);

        resolve(response)
      })
    })
  },
  copyTo: function(oQueryObj) {
    if (this._hasAggregation())
      throw "You cannot copy while doing aggregation";

    if (!this.sizeResult) {
      this.sizeResult = 50000000;
    }

    return this.run()
    .then(function(arroHit) {
      for (var i = 0; i < arroHit.length; i++) {
        var oHit = arroHit[i];
        oQueryObj.bulk(oHit.data(), oHit.id(), oHit.type())
      }

      return oQueryObj.run();
    })
  },
  bulk: function(p_oData, p_sId, p_sType) {
    if (!this.sType && !p_sType)
      throw "You need to set a type when you create a query or when you call the bulk() method to copy";

    if (!this.sID && !p_sId)
      throw "You need to set an id either when you define a query with id() or when calling the bulk() method";

    this.arroBulk.push({
      "index": {
        "_index": this.sIndex,
        "_type": this.sType || p_sType,
        "_id": this.sID || p_sId
      }
    })
    this.arroBulk.push(p_oData);
    return this;
  },
  log: function() {
    this._generateQuery().then(function(oData) {
      console.log(JSON.stringify(oData, null, 2));
    })

    return this;
  },
  use: function(p_sClientName) {
    if (!oESClientList[p_sClientName])
      throw "client with name " + p_sClientName + " doesn't exists";

    this.oESClient = oESClientList[p_sClientName];
    return this;
  },
  size: function(p_iSize) {
    this.sizeResult = p_iSize;
    return this;
  },
  fields: function(p_arroFields) {
    this.arrsFields = p_arroFields;
    return this;
  },
  sort: function(p_arroSorts){
    this.arroSorts = p_arroSorts
    return this;
  },
  id: function(p_sID) {
    this.sID = p_sID;
    return this;
  },
  body: function(p_oBody) {
    this.oBody = p_oBody;
    return this;
  },
  update: function(p_oData) {
    this.oDoc = p_oData
    return this;
  },
  upsert: function(p_oData) {
    this.oDoc = p_oData
    this.bUpsert = true;
    return this;
  },
  aggs: function() {
    this.oAB.add.apply(this.oAB, arguments)
    return this;
  },
  delete: function() {
    this.bDelete = true;
    return this.run();
  },
  count: function()  {
    this.bCount = true;
    return this.run();
  },
  run: function(p_bLog) {
    var self = this;

    this.oESClient = this._getClient();

    if (!this.oESClient) {
      throw "need to setup the elasticsearch client";
    }

    return this._generateQuery()
      .then(function(oQueryData) {
        if(p_bLog)
          console.log(JSON.stringify(oQueryData, null, 2));

        var oQuery = oQueryData.query;
        var sType = oQueryData.type;

        if(sType == "bulk"){
          var arroDataBulk = _.chunk(self.arroBulk, 500);

          var arroPromises = [];
          for(var i = 0 ; i < arroDataBulk.length; i++){
            arroPromises.push((function(arroBulk){
              return function(){
                return new Promise(function(resolve,reject){
                  self.oESClient.bulk({
                    body: arroBulk
                  }, function(err, response) {
                    if(err)
                      return reject(err)

                    resolve(true);
                  });
                })
              }
            })(arroDataBulk[i]))
          }
          return promiseSerie(arroPromises);
        }

        return new Promise(function(resolve, reject) {

          //if size is more than 5000 we do an automatic scroll
          if (sType == "search" && oQuery.body.size && oQuery.body.size > 5000 && !self.oAB.count()) {
            var arroData = [];

            oQuery.scroll = "1m";
            oQuery.size = 5000;

            var es_stream = new ElasticsearchScrollStream(self.oESClient, oQuery, ['_id', '_index', '_type']);

            es_stream.on('data', function(data) {
              var current_doc = JSON.parse(data.toString());

              var _id = current_doc._id
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
                  total: arroData.length,
                  hits: arroData
                }
              }

              resolve((new Response(response)).results());
            });

            es_stream.on('error', function(err) {
              reject(err);
            });
          }
          else {
            self.oESClient[sType](oQuery, function(err, response) {
              if (err) {
                if (sType == "get" && err.status == 404) {
                  return resolve(false);
                } else {
                  return reject(err)
                }
              }

              switch (sType) {
                case "search":
                  if (response.aggregations) {
                    response.aggregations.pattern = self.oAB;
                    return resolve(new Response(response))
                  }

                  return resolve((new Response(response)).results())
                  break;
                case "get":
                  return resolve((new Response(response)).result())
                  break;
                case "count":
                  return resolve(response.count)
                  break;
                default:
                  return resolve(self.oBody ||  self.oDoc ||  self.bDelete || self.bEmptyIndex);
              }
            })
          }
        });
      })
      .catch(function(err){
        return Promise.reject(self.onErrorMethod(err))
      })
  }
}

module.exports = {
  onError: function(p_fFuntion){
    onErrorMethod = p_fFuntion;
  },
  AddClient: AddClient,
  addClient: AddClient,
  getClient: getClient,
  Query: function(p_sIndex, p_sType) {
    return new Elasticsearch(p_sIndex, p_sType)
  },
  query: function(p_sIndex, p_sType) {
    return new Elasticsearch(p_sIndex, p_sType)
  },
  addType: function() {
    return new SearchType();
  },
  addFilter: function() {
    return new QueryBuilder();
  },
  filter: {
    should: function() {
      var oQB = new QueryBuilder();
      return oQB.should.apply(oQB, arguments);
    },
    must: function() {
      var oQB = new QueryBuilder();
      return oQB.must.apply(oQB, arguments);
    },
    filter: function() {
      var oQB = new QueryBuilder();
      return oQB.filter.apply(oQB, arguments);
    },
    must_not: function() {
      var oQB = new QueryBuilder();
      return oQB.must_not.apply(oQB, arguments);
    }
  },
  type: {
    term: function() {
      var oST = new SearchType();
      return oST.term.apply(oST, arguments);
    },
    terms: function() {
      var oST = new SearchType();
      return oST.terms.apply(oST, arguments);
    },
    exists: function() {
      var oST = new SearchType();
      return oST.exists.apply(oST, arguments);
    },
    range: function() {
      var oST = new SearchType();
      return oST.range.apply(oST, arguments);
    },
    wildcard : function(){
      var oST = new SearchType();
      return oST.wildcard.apply(oST, arguments);
    },
    prefix : function(){
      var oST = new SearchType();
      return oST.prefix.apply(oST, arguments);
    },
    nested : function(){
      var oST = new SearchType();
      return oST.nested.apply(oST, arguments);
    }
  },
  agg: {
    average: function(p_sName) {
      return function() {
        var oST = new AggregationType(p_sName);
        return oST.average.apply(oST, arguments);
      }
    },
    cardinality: function(p_sName) {
      return function() {
        var oST = new AggregationType(p_sName);
        return oST.cardinality.apply(oST, arguments);
      }
    },
    extended_stats: function(p_sName) {
      return function() {
        var oST = new AggregationType(p_sName);
        return oST.extended_stats.apply(oST, arguments);
      }
    },
    maximum: function(p_sName) {
      return function() {
        var oST = new AggregationType(p_sName);
        return oST.maximum.apply(oST, arguments);
      }
    },
    minimum: function(p_sName) {
      return function() {
        var oST = new AggregationType(p_sName);
        return oST.minimum.apply(oST, arguments);
      }
    },
    sum: function(p_sName) {
      return function() {
        var oST = new AggregationType(p_sName);
        return oST.sum.apply(oST, arguments);
      }
    },
    value_count: function(p_sName) {
      return function() {
        var oST = new AggregationType(p_sName);
        return oST.value_count.apply(oST, arguments);
      }
    },
    terms: function(p_sName,p_oOptions) {
      return function() {
        var oST = new AggregationType(p_sName);
        return oST.terms.apply(oST, arguments);
      }
    },
    date_histogram: function(p_sName) {
      return function() {
        var oST = new AggregationType(p_sName);
        return oST.date_histogram.apply(oST, arguments);
      }
    }
  }
}
