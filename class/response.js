const Hit = require('./hit');
const Aggregation = require('./aggregation');

function Response(oResponse) {
  this.oResponse = oResponse;
}

Response.prototype = {
  count() {
    if (!this.oResponse.hits) return Promise.resolve(this.oResponse.found ? 1 : 0);

    return Promise.resolve(this.oResponse.hits.total);
  },
  result() {
    if (this.oResponse.found) {
      return Promise.resolve(new Hit(this.oResponse));
    }
    return Promise.resolve(false);
  },
  results() {
    return Promise.resolve(this.oResponse.hits.hits.map(o => new Hit(o)));
  },
  agg(sName) {
    if (!this.oResponse.aggregations || !this.oResponse.aggregations[sName]) return false;

    return new Aggregation(this.oResponse.aggregations[sName], this.oResponse.aggregations.pattern.getByName(sName));
  },
};

module.exports = Response;
