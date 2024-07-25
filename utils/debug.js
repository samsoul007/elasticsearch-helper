const debug = require("debug")

module.exports = (logId) => {
    return debug(`elasticsearch-helper:${logId}`)
}


