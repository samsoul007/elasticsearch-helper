const ConditionBuilder = require('./condition-builder');

function QueryBuilder() {
  this.arroConditions = {};
}

QueryBuilder.prototype = {
  _add(CB, values) {
    if (this.arroConditions[CB.getName()]) throw new Error(`you can only have one ${CB.getName()} condition`);

    Object.keys(values).forEach((key) => {
      CB.add(values[key]);
    });

    this.arroConditions[CB.getName()] = CB;
    return this;
  },
  must(...args) {
    const oCB = new ConditionBuilder('must');
    return this._add(oCB, args);
  },
  must_not(...args) {
    const oCB = new ConditionBuilder('must_not');
    return this._add(oCB, args);
  },
  should(...args) {
    const oCB = new ConditionBuilder('should');
    return this._add(oCB, args);
  },
  filter(...args) {
    const oCB = new ConditionBuilder('filter');
    return this._add(oCB, args);
  },
  render() {
    const self = this;

    return {
      bool: (() => {
        const oReturn = {};

        Object.keys(self.arroConditions).forEach((key) => {
          const oData = self.arroConditions[key].render();
          oReturn[oData.name] = oData.conditions;
        });

        return oReturn;
      })(),
    };
  },
};

module.exports = QueryBuilder;
