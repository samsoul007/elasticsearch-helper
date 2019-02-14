function AggregationBuilder() {
  this.oAggregations = {};
}

AggregationBuilder.prototype = {
  getByName(sName) {
    return this.oAggregations[sName] || false;
  },
  count() {
    return Object.keys(this.oAggregations).length;
  },
  _add(values) {
    Object.keys(values).forEach((key) => {
      const oAgg = values[key];
      if (this.oAggregations[oAgg.getName()]) throw new Error(`you can only have one ${oAgg.getName()} aggregation`);

      this.oAggregations[oAgg.getName()] = oAgg;
    });

    return this;
  },
  add(...args) {
    return this._add(...args);
  },
  render() {
    const self = this;
    const oReturn = {};
    Object.keys(self.oAggregations).forEach((key) => {
      oReturn[key] = self.oAggregations[key].render();
    });

    return oReturn;
  },
};

module.exports = AggregationBuilder;
