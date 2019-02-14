function ConditionBuilder(sName) {
  this.arroConditions = [];
  this.conditionName = sName;
}

ConditionBuilder.prototype = {
  getName() {
    return this.conditionName;
  },
  add(oType) {
    this.arroConditions.push(oType);
    return this;
  },
  render() {
    return {
      name: this.conditionName,
      conditions: this.arroConditions.map(o => o.render()),
    };
  },
};

module.exports = ConditionBuilder;
