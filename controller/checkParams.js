const APIError  = require('../rest').APIError
/**
 * 检查参数是否匹配
 * @param {Object} obj 要查询参数个数的对象
 * @param {Number} length 要查询参数的应有个数
 */
function JudgeParams(obj, length) {
    if (Object.keys(obj).length != length) {
        throw new APIError(null, 'Lack of parameter')
    }
}

module.exports = JudgeParams