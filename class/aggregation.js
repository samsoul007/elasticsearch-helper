const moment = require('moment');
const Hit = require('./hit');

function Aggregation(oAggregation, oPattern) {
  this.oAggregation = oAggregation;
  this.oPattern = oPattern;
}

Aggregation.prototype = {
  values() {
    switch (this.oPattern.getType()) {
      case 'terms':
        return this.oAggregation.buckets.map(value => new Hit({
          _id: value.key,
          _source: value.doc_count,
        }));
      case 'date_histogram':
        return this.oAggregation.buckets.map(value => new Hit({
          _id: new moment(value.key), // eslint-disable-line new-cap
          _source: value.doc_count,
        }));
      case 'avg':
      case 'cardinality':
      case 'max':
      case 'min':
      case 'sum':
      case 'value_count':
        return new Hit({
          _id: '',
          _source: this.oAggregation.value,
        });
      case 'extended_stats':
        return new Hit({
          _id: '',
          _source: this.oAggregation,
        });
      default:
        return new Hit({
          _id: '',
          _source: this.oAggregation.value,
        });
    }
  },
  agg(sName) {
    const self = this;
    return self.oAggregation.buckets.reduce((obj, value) => {
      if (value[sName]) obj[value.key] = new Aggregation(value[sName], self.oPattern.aggs().getByName(sName)); // eslint-disable-line no-param-reassign
      return obj;
    }, {});
  },
};

module.exports = Aggregation;
