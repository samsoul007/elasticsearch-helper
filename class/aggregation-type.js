

const AggregationBuilder = require('./aggregation-builder');

function AggregationType(sName) {
  this.sName = sName;
  this.sType = false;
  this.acceptSubAgg = true;
  this.oOptions = {};
  this.oAB = new AggregationBuilder();
}

AggregationType.prototype = {
  getName() {
    return this.sName;
  },
  getType() {
    return this.sType;
  },

  average(sKey) {
    this.sType = 'avg';
    this.acceptSubAgg = false;

    this.oOptions = {
      field: sKey,
    };

    return this;
  },
  cardinality(sKey) {
    this.sType = 'cardinality';
    this.acceptSubAgg = false;

    this.oOptions = {
      field: sKey,
    };

    return this;
  },
  extended_stats(sKey) {
    this.sType = 'extended_stats';
    this.acceptSubAgg = false;

    this.oOptions = {
      field: sKey,
    };

    return this;
  },
  maximum(sKey) {
    this.sType = 'max';
    this.acceptSubAgg = false;

    this.oOptions = {
      field: sKey,
    };

    return this;
  },
  minimum(sKey) {
    this.sType = 'min';
    this.acceptSubAgg = false;

    this.oOptions = {
      field: sKey,
    };

    return this;
  },
  sum(sKey) {
    this.sType = 'sum';
    this.acceptSubAgg = false;

    this.oOptions = {
      field: sKey,
    };

    return this;
  },
  value_count(sKey) {
    this.sType = 'value_count';
    this.acceptSubAgg = false;

    this.oOptions = {
      field: sKey,
    };

    return this;
  },
  groupByLatest(sKey, sortByField, oOptions) {
    this.sType = 'group';

    this.oOptions = {
      terms: {
        field: sKey,
        size: 10000
      },
      aggs: {
        doc: {
          top_hits: {
            size: 1,
            sort: [
              {
                [sortByField]: {
                  "order": "desc"
                }
              }
            ]
          }
        }
      }
    };

    if (oOptions) {
      Object.keys(oOptions).forEach((attrname) => {
        this.oOptions[attrname] = oOptions[attrname];
      });
    }

    return this;
  },
  terms(sKey, oOptions) {
    this.sType = 'terms';

    this.oOptions = {
      field: sKey,
    };

    if (oOptions) {
      Object.keys(oOptions).forEach((attrname) => {
        this.oOptions[attrname] = oOptions[attrname];
      });
    }

    return this;
  },
  date_histogram(sKey, sInterval, oOptions) {
    this.sType = 'date_histogram';

    this.oOptions = {
      field: sKey,
      fixed_interval: sInterval,
    };

    if (oOptions) {
      Object.keys(oOptions).forEach((attrname) => {
        this.oOptions[attrname] = oOptions[attrname];
      });
    }

    return this;
  },
  aggs(...args) {
    if (!arguments.length) return this.oAB;

    if (this.acceptSubAgg === false) throw new Error(`${this.sType} does not support sub-aggregations`);

    this.oAB.add(...args);
    return this;
  },
  render() {

    const oObj = {
      [this.sType]: this.oOptions,
    };

    if (this.oAB.count()) oObj.aggs = this.oAB.render();

    return oObj;
  },
};

module.exports = AggregationType;
