const ES = require('elasticsearch');
const ElasticsearchScrollStream = require('elasticsearch-scroll-stream');
const _ = require('lodash');

const Response = require('./class/response');
const QueryBuilder = require('./class/query-builder');
const AggregationBuilder = require('./class/aggregation-builder');
const SearchType = require('./class/search-type');
const AggregationType = require('./class/aggregation-type');
// var oESClient = false;
const oESClientList = {};

let sDefaultName = 'default';

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
const AddClient = (...args) => {
  let sName = 'default';
  let sHost = false;

  if (args.length === 1) {
    if (oESClientList.default) return;

    [sHost] = args;
  } else {
    if (oESClientList[args[0]]) return;

    ([sName, sHost] = args);

    if (args[2] && args[2] === true) sDefaultName = sName;
  }

  oESClientList[sName] = new ES.Client({
    host: sHost,
    // log: 'trace'
  });

  oESClientList[sName].host = sHost;
};

/**
 * Return a client
 * @method getClient
 * @param {String} Name - host (ex: 'myES')
 * @return {Object} Client or false if not found
 */
const getClient = (...args) => {
  if (args.length === 0 && oESClientList[sDefaultName]) {
    return oESClientList[sDefaultName];
  }
  if (oESClientList[args[0]]) {
    return oESClientList[args[0]];
  }
  return false;
};

const indexes = sESClient => Promise.resolve()
  .then(() => {
    if (sESClient) return getClient(sESClient);

    return getClient();
  })
  .then((oClient) => {
    if (!oClient) return Promise.reject(new Error('Cannot find client'));

    return oClient.cat.indices()
      .then(resp => resp.split('\n'))
      .then((arrsIndexes) => {
        const columns = ['health', 'status', 'index', 'uuid', null, null, 'docs.count', 'docs.deleted', 'store.size', 'pri.store.size'];
        const parse = [null, null, null, null, null, null, parseInt, parseInt, null, null];
        const arroIndexes = [];

        for (let i = 0; i < arrsIndexes.length; i += 1) {
          if (arrsIndexes[i].trim() !== '') {
            const arrsLine = arrsIndexes[i].replace(/\s\s+/g, ' ').split(' ');
            const oIndex = {};
            for (let j = 0; j < arrsLine.length; j += 1) {
              if (columns[j]) {
                oIndex[columns[j]] = parse[j] ? parse[j](arrsLine[j]) : arrsLine[j];
              }
            }
            arroIndexes.push(oIndex);
          }
        }

        return arroIndexes;
      });
  });

let onErrorMethod = err => err;

const promiseSerie = (arroPromises) => {
  const p = Promise.resolve();
  return arroPromises.reduce((pacc, fn) => {
    pacc = pacc.then(fn); // eslint-disable-line no-param-reassign
    return pacc;
  }, p);
};

const Elasticsearch = function(sIndex, sType) {
  this.oESClient = false;

  this.sIndex = sIndex;
  this.sType = sType;
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
  this.iFrom = false;

  this.onPagination = false;
  this.iPageSize = 250;
  this.bUpsert = false;

  this.oQB = new QueryBuilder();
  this.oAB = new AggregationBuilder();
}

Elasticsearch.prototype = {
  type(...args) {
    if (!args.length) return this.sType;

    [this.sType] = args;
    return this;
  },
  onError(fFunction) {
    this.onErrorMethod = fFunction;
    return this;
  },
  onPagination(fFuntion, iSize) {
    this.onPagination = fFuntion;
    this.iPageSize = iSize || this.iPageSize;
    return this;
  },
  _hasAggregation() {
    return !!this.oAB.count();
  },
  _getClient() {
    return this.oESClient || oESClientList.default;
  },
  _generateQuery() {
    return new Promise(((resolve, reject) => {
      let sType = 'search';
      const oQuery = {
        index: this.sIndex,
      };

      if (this.sType) oQuery.type = this.sType;

      // Dealing with bulk
      if (this.arroBulk.length) {
        if (this.sID) {
          return reject(new Error('You cannot use id() with bulk()'));
        }

        oQuery.body = this.arroBulk;
        sType = 'bulk';
      } else {
        if (this.sID) {
          if (!this.sType) return reject(new Error('You need to set a type to search or update by ID'));

          oQuery.id = this.sID;
          sType = 'get';
        }

        if (this.bDelete) {
          if (this.sID) sType = 'delete';
          else {
            if (!this.bHasCondition) return reject(new Error('You need a request body'));

            oQuery.body = {
              query: this.oQB.render(),
            };

            sType = 'deleteByQuery';
          }
        } else if (this.bEmptyIndex) {
          oQuery.body = {
            query: {
              match_all: {},
            },
          };

          sType = 'deleteByQuery';
        } else if (this.oDoc) {
          if (!this.sID) return reject(new Error('You need to set an id to update'));

          oQuery.body = {
            doc: this.oDoc,
          };

          if (this.upsert) oQuery.body.doc_as_upsert = true;

          sType = 'update';
        } else if (this.bCount) {
          oQuery.body = {
            query: this.oQB.render(),
          };
          sType = 'count';
        } else if (this.oBody) {
          if (!this.sID) return reject(new Error('You need to set an id to index'));

          oQuery.body = this.oBody;
          sType = 'index';
        } else if (!this.sID) {
          oQuery.body = {
            query: this.oQB.render(),
          };

          oQuery.body.size = this.sizeResult || 10;

          if (this.iFrom) oQuery.body.from = this.iFrom;

          oQuery.body._source = this.arrsFields;
          oQuery.body.sort = this.arroSorts;
        }

        if (sType === 'search' && this.oAB.count()) {
          oQuery.body.size = 0;
          oQuery.body.aggs = this.oAB.render();
        }
      }

      return resolve({
        type: sType,
        query: oQuery,
      });
    }));
  },
  must(...args) {
    this.oQB.must(...args);
    this.bHasCondition = true;
    return this;
  },
  should(...args) {
    this.oQB.should(...args);
    this.bHasCondition = true;
    return this;
  },
  filter(...args) {
    this.oQB.filter(...args);
    this.bHasCondition = true;
    return this;
  },
  must_not(...args) {
    this.oQB.must_not(...args);
    this.bHasCondition = true;
    return this;
  },
  index() {

    return {
      touch: () =>  {
        if(!this.sType) return Promise.reject(new Error(`index type missing`))

        return this.index().exists(this.sIndex)
        .then(exists => {
          if(exists)
            return Promise.resolve(true)

          return this.id("____test_____").body({}).run()
          .then(() => {
            return this.id("____test_____").delete()
          })
          .then(() => true);
        })
      },
      delete: () => {
        if (this.sIndex.indexOf('*') !== -1 || this.sIndex.split(',').length > 1) return Promise.reject(new Error('For security reasons you cannot delete multiple indexes'));

        return new Promise(((resolve, reject) => {
          this._getClient().indices.delete({
            index: this.sIndex,
          }, (err, response) => {
            if (err) return reject(err);

            return resolve(response.acknowledged);
          });
        }))
        .catch(err => Promise.reject(this.onErrorMethod(err)))
      },
      mappings: () => {
        return this._getClient().indices.getMapping({
          index: this.sIndex,
        })
        .catch(err => Promise.reject(this.onErrorMethod(err)))
      },
      empty: () => {
        this.bEmptyIndex = true;
        return this.run();
      },
      exists: () => {
        return this._getClient().indices.exists({
          index: this.sIndex,
        })
        .catch(err => Promise.reject(this.onErrorMethod(err)))
      },
      copyTo: (oQueryObj) => {
        if (this._hasAggregation()) throw new Error('You cannot copy while doing aggregation');

        if (!this.sizeResult) {
          this.sizeResult = 50000000;
        }

        return this.run()
          .then((arroHit) => {
            for (let i = 0; i < arroHit.length; i += 1) {
              const oHit = arroHit[i];
              oQueryObj.bulk(oHit.data(), oHit.id(), oHit.type());
            }

            return oQueryObj.run();
          });
      }
    }

  },
  deleteIndex() {
    return this.index().delete();
  },
  mappings() {
    return this.index().mappings();
  },
  empty() {
    return this.index().empty();
  },
  exists() {
    return this.index().exists();
  },
  copyTo(...args) {
    return this.index().copyTo(...args);
  },
  bulk(oData, sId, sType) {
    if (!this.sType && !sType) throw new Error('You need to set a type when you create a query or when you call the bulk() method to copy');

    if (!this.sID && !sId) throw new Error('You need to set an id either when you define a query with id() or when calling the bulk() method');

    this.arroBulk.push({
      index: {
        _index: this.sIndex,
        _type: this.sType || sType,
        _id: this.sID || sId,
      },
    });
    this.arroBulk.push(oData);
    return this;
  },
  log() {
    this._generateQuery().then((oData) => {
      console.log(JSON.stringify(oData, null, 2)); // eslint-disable-line no-console
    });

    return this;
  },
  use(sClientName) {
    if (!oESClientList[sClientName]) throw new Error(`client with name ${sClientName} doesn't exists`);

    this.oESClient = oESClientList[sClientName];
    return this;
  },
  size(iSize) {
    this.sizeResult = iSize;
    return this;
  },
  from(iIndex) {
    this.iFrom = iIndex;
    return this;
  },
  fields(arroFields) {
    this.arrsFields = arroFields;
    return this;
  },
  sort(arroSorts) {
    this.arroSorts = arroSorts;
    return this;
  },
  id(sID) {
    if (!sID) throw new Error('ID in id() not set');

    this.sID = sID;
    return this;
  },
  body(oBody) {
    this.oBody = oBody;
    return this;
  },
  update(oData) {
    this.oDoc = oData;
    return this;
  },
  upsert(oData) {
    this.oDoc = oData;
    this.bUpsert = true;
    return this;
  },
  aggs(...args) {
    this.oAB.add(...args);
    return this;
  },
  delete() {
    this.bDelete = true;
    return this.run();
  },
  count() {
    this.bCount = true;
    return this.run();
  },
  run(bLog) {
    this.oESClient = this._getClient();

    if (!this.oESClient) {
      throw new Error('need to setup the elasticsearch client');
    }

    return this._generateQuery()
      .then(oQueryData => Promise.resolve()
        .then(() => {
          if (bLog) console.log(JSON.stringify(oQueryData, null, 2)); // eslint-disable-line no-console

          const oQuery = oQueryData.query;
          const sType = oQueryData.type;

          if (sType === 'bulk') {
            const arroDataBulk = _.chunk(this.arroBulk, 500);

            const arroPromises = [];
            for (let i = 0; i < arroDataBulk.length; i += 1) {
              arroPromises.push((arroBulk => () => new Promise(((resolve, reject) => {
                this.oESClient.bulk({
                  body: arroBulk,
                }, (err) => {
                  if (err) return reject(err);

                  return resolve(true);
                });
              })))(arroDataBulk[i]));
            }
            return promiseSerie(arroPromises);
          }

          return new Promise(((resolve, reject) => {
            // if size is more than 5000 we do an automatic scroll
            if (sType === 'search' && oQuery.body.size && oQuery.body.size > 5000 && !this.oAB.count()) {
              const arroData = [];

              oQuery.scroll = '1m';
              oQuery.size = 5000;

              const oESStream = new ElasticsearchScrollStream(this.oESClient, oQuery, ['_id', '_index', '_type']);

              oESStream.on('data', (data) => {
                const oCurrentDoc = JSON.parse(data.toString());

                const {
                  _id,
                  _index,
                  _type,
                } = oCurrentDoc;

                delete oCurrentDoc._id;
                delete oCurrentDoc._index;
                delete oCurrentDoc._type;

                arroData.push({
                  _id,
                  _index,
                  _type,
                  _source: oCurrentDoc,
                });
              });

              oESStream.on('end', () => {
                const response = {
                  hits: {
                    total: arroData.length,
                    hits: arroData,
                  },
                };

                resolve((new Response(response)).results());
              });

              oESStream.on('error', (err) => {
                reject(err);
              });
            } else {
              this.oESClient[sType](oQuery, (err, response) => {
                if (err) {
                  if (sType === 'get' && err.status === 404) {
                    return resolve(false);
                  }
                  return reject(err);
                }

                switch (sType) {
                  case 'search':
                    if (response.aggregations) {
                      response.aggregations.pattern = this.oAB;
                      return resolve(new Response(response));
                    }

                    return resolve((new Response(response)).results());
                  case 'get':
                    return resolve((new Response(response)).result());
                  case 'count':
                    return resolve(response.count);
                  default:
                    return resolve(this.oBody || this.oDoc || this.bDelete || this.bEmptyIndex);
                }
              });
            }
          }));
        })
        .catch((err) => {
          const error = err;
          error.query = oQueryData;
          error.client = this.oESClient.host;
          return Promise.reject(this.onErrorMethod(error));
        }));
  },
};

module.exports = {
  onError(fFuntion) {
    onErrorMethod = fFuntion;
  },
  AddClient,
  addClient: AddClient,
  getClient,
  indexes,
  Query(sIndex, sType) {
    return new Elasticsearch(sIndex, sType);
  },
  query(sIndex, sType) {
    return new Elasticsearch(sIndex, sType);
  },
  addType() {
    return new SearchType();
  },
  addFilter() {
    return new QueryBuilder();
  },
  filter: {
    should(...args) {
      const oQB = new QueryBuilder();
      return oQB.should(...args);
    },
    must(...args) {
      const oQB = new QueryBuilder();
      return oQB.must(...args);
    },
    filter(...args) {
      const oQB = new QueryBuilder();
      return oQB.filter(...args);
    },
    must_not(...args) {
      const oQB = new QueryBuilder();
      return oQB.must_not(...args);
    },
  },
  type: {
    term(...args) {
      const oST = new SearchType();
      return oST.term(...args);
    },
    terms(...args) {
      const oST = new SearchType();
      return oST.terms(...args);
    },
    exists(...args) {
      const oST = new SearchType();
      return oST.exists(...args);
    },
    range(...args) {
      const oST = new SearchType();
      return oST.range(...args);
    },
    wildcard(...args) {
      const oST = new SearchType();
      return oST.wildcard(...args);
    },
    prefix(...args) {
      const oST = new SearchType();
      return oST.prefix(...args);
    },
    query_string(...args) {
      const oST = new SearchType();
      return oST.query_string(...args);
    },
    nested(...args) {
      const oST = new SearchType();
      return oST.nested(...args);
    },
    geo(...args) {
      const oST = new SearchType();
      return oST.geo(...args);
    },
  },
  agg: {
    average(sName) {
      return (...args) => {
        const oST = new AggregationType(sName);
        return oST.average(...args);
      };
    },
    cardinality(sName) {
      return (...args) => {
        const oST = new AggregationType(sName);
        return oST.cardinality(...args);
      };
    },
    extended_stats(sName) {
      return (...args) => {
        const oST = new AggregationType(sName);
        return oST.extended_stats(...args);
      };
    },
    maximum(sName) {
      return (...args) => {
        const oST = new AggregationType(sName);
        return oST.maximum(...args);
      };
    },
    minimum(sName) {
      return (...args) => {
        const oST = new AggregationType(sName);
        return oST.minimum(...args);
      };
    },
    sum(sName) {
      return (...args) => {
        const oST = new AggregationType(sName);
        return oST.sum(...args);
      };
    },
    value_count(sName) {
      return (...args) => {
        const oST = new AggregationType(sName);
        return oST.value_count(...args);
      };
    },
    terms(sName) {
      return (...args) => {
        const oST = new AggregationType(sName);
        return oST.terms(...args);
      };
    },
    date_histogram(sName) {
      return (...args) => {
        const oST = new AggregationType(sName);
        return oST.date_histogram(...args);
      };
    },
  },
};
