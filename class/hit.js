function Hit(oHit) {
  this.oHit = oHit;
}

Hit.prototype = {
  id() {
    return this.oHit._id;
  },
  data() {
    return this.oHit._source;
  },
  index() {
    return this.oHit._index;
  },
  type() {
    return this.oHit._type;
  },
};

module.exports = Hit;
