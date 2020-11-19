const mylog = (function () {
    return {
        log: function () {
            if (process.env !== 'production') {
                var args = Array.prototype.slice.call(arguments);
                console.log.apply(console, args);
            }
        },
        warn: function () {
            var args = Array.prototype.slice.call(arguments);
            console.warn.apply(console, args);
        },
        error: function () {
            var args = Array.prototype.slice.call(arguments);
            console.error.apply(console, args);
        }
    }
}())

module.exports = {
    mylog
}