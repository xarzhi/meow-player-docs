/**
 *
 * @param {*} seconds 单位秒
 * @returns
 */
export const formatTime = seconds => {
	const obj = {
		hours: Math.floor(seconds / 3600)
			.toString()
			.padStart(2, '0'),
		mins: Math.floor((seconds % 3600) / 60)
			.toString()
			.padStart(2, '0'),
		secs: Math.floor(seconds % 60)
			.toString()
			.padStart(2, '0'),
	}
	return obj
}

export const isInside = (point, rect) => {
	return point.x > rect.x && point.x < rect.x + rect.width && point.y > rect.y && point.y < rect.y + rect.height
}