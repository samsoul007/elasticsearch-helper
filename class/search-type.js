const _ = require('lodash');

function SearchType() {
  this.sKey = false;
  this.uValue = false;
  this.sType = false;
}

SearchType.prototype = {
  _setValues(sType, sKey, uValue) {
    this.sKey = sKey;
    this.uValue = uValue;
    this.sType = sType;
  },
  term(sKey, sValue) {
    if (sValue.constructor === Array) throw new Error('cannot to be an array, use terms');

    this._setValues('term', sKey, sValue);
    return this;
  },
  exists(sKey) {
    this._setValues('exists', 'field', sKey);
    return this;
  },
  range(sKey, oRange) {
    this._setValues('range', sKey, oRange);
    return this;
  },
  terms(sKey, arrsValue) {
    if (arrsValue.constructor !== Array) throw new Error('needs to be an array');

    this._setValues('terms', sKey, arrsValue);
    return this;
  },
  wildcard(sKey, sValue) {
    this._setValues('wildcard', sKey, sValue);
    return this;
  },
  prefix(sKey, sValue) {
    this._setValues('prefix', sKey, sValue);
    return this;
  },
  query_string(sSearch, oQB) {
    this._setValues('query_string', sSearch, oQB);

    return this;
  },
  nested(sKey, oQB) {
    this._setValues('nested', sKey, oQB);

    return this;
  },
  geo(sKey, oPoint, sDistance, sDistanceType) {
    if (sDistanceType && (sDistanceType !== 'arc' || sDistanceType !== 'plane')) throw new Error("Distance type needs to be 'arc' or 'plane'");

    this._setValues('geo_distance', sKey, {
      distance: sDistance,
      type: sDistanceType,
      point: oPoint,
    });
    return this;
  },
  geoPolygon(sKey, coordinates = []) {
    this._setValues('geo_polygon', sKey, {
      coordinates
    });
    return this;
  },
  geoShape(sKey, data = {}) {
    this._setValues('geo_shape', sKey, data);
    return this;
  },
  render() {
    const oObj = {};

    switch (this.sType) {
      case 'query_string':
        oObj[this.sType] = _.assignIn({
          query: this.sKey,
        }, this.uValue);

        break;
      case 'geo_distance':
        oObj[this.sType] = {
          distance: this.uValue.distance,
          [this.sKey]: this.uValue.point,
        };

        if (this.uValue.type) {
          oObj[this.sType].distance_type = this.uValue.type;
        }
        break;

      case 'geo_polygon':
        oObj[this.sType] = {
          [this.sKey]: {
            "points": this.uValue.coordinates
          },
        };
        break;

      case 'geo_shape':
        oObj[this.sType] = {
          [this.sKey]: this.uValue.data,
        };
        break;

      case 'nested':
        oObj[this.sType] = {
          path: this.sKey,
          query: this.uValue.render(),
        };
        break;
      default:
        oObj[this.sType] = {};
        oObj[this.sType][this.sKey] = this.uValue;
        break;
    }

    return oObj;
  },
};

module.exports = SearchType;
