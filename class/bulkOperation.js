const validOperations = ["index", "update", "delete", "create"]

class bulkOperation {
  constructor(id) {
    this.id = id ;
  }

  id(id) {
    this.id = id
    return this;
  }

  operation(operation) {
    if (validOperations.indexOf(operation) === -1)
      throw new Error(`Operation must be one of those: ${validOperations.join(", ")}`)

    this.op = operation
    return this;
  }

  data(data) {
    this.data = data
    return this;
  }

  docAsUpsert() {
    this._docAsUpsert = true
    return this;
  }

  _render() {
    const render = [];

    render.push({
      [this.op]: {
        "_id": this.id
      }
    })

    if (this.op !== "delete") {
      render.push({
        "doc_as_upsert": !!this._docAsUpsert,
        "doc": this.data
      })
    }

    return render
  }
}


module.exports = { bulkOperation };
