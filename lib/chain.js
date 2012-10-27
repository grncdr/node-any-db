module.exports = chain

function chain (steps) {
	return function (it, callback) {
		var i = 0
		;(function next (err) {
			if (err) return callback(err)
			var step = steps[i++]
			if (!step) return
			step(it, callback)
		})()
	}
}
