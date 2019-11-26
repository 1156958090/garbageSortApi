const jwt = require('jsonwebtoken') // 用于签发、解析`token`
const MODEL = require('../models')
const JudgeParams = require('./checkParams')
const USER = MODEL.user
const ORDER = MODEL.order
const query = require('../db').query
const Op = require('../db').Op

// 创建发布订单
async function pubOrders(ctx, next) {
    let { addres,
        contact,
        telephone,
        taketime,
        content,
        weight,
        remarks,
        longitude, // 经度
        latitude, // 纬度
        city,
    } = ctx.request.body // 忘记了可以直接用解构的方式来初始化
    let email = ctx.getEmail().email
    JudgeParams(ctx.request.body, 9)
    // 创建一个订单号，订单号由时间戳，用户邮箱前四位，订单编号组成
    let orderid = await varifyOrderid()
    let newPub = await ORDER.create({
        orderid: orderid,
        email: email,
        emailworker: null,
        city: city,
        addres: addres,
        contact: contact,
        telephone: telephone,
        taketime: taketime,
        content, content,
        weight: weight,
        remarks: remarks,
        longitude: longitude,
        latitude: latitude,
        overtime: Date.now() + 30 * 60 * 1000,
        completed: 0
    })
    ctx.rest({
        code: '1',
        message: 'publish OK'
    })
    // 由于生成订单号是生成随机数，而随机数又有重复的可能，即使是十六位的数字，基数大了之后有重复的几率还是会升高
    // 所以还是要验证orderid是否重复
    async function varifyOrderid() {
        let orderid = Math.random() * Math.pow(10, 16)
        console.log(orderid + '这是orderid')
        // 先查找数据库是否有该订单号如果有的话就换一个
        let result = await ORDER.findOne({
            where: {
                orderid: orderid
            }
        })
        if (result) {
            var result2 = varifyOrderid()
            return result2
        }
        else {
            return orderid
        }
    }
}

// 获取附近的订单
async function getDliOrders(ctx, next) {
    const { longitude,
        latitude,
        limit,
        offset
    } = ctx.query
    const email = ctx.getEmail().email
    console.log(email)
    // 这里的sql需要用到自定义函数跟sql语句符合，暂时用sequelize不知道怎么实现，所以选择使用算了原生的查询
    // 返回的是距离骑手八千米以内的订单
    // sequelize的写成如下形式略微复杂，失去了封装的意义。所以我打算直接使用原生sql语句
    const sql = `select * 
                 from orders 
                 where _fnGetdistance(${longitude},${latitude},longitude,latitude) < 8000 
                 limit ${limit} 
                 offset ${offset * 10}`
    console.log(sql)
    let result = await query(sql, { row: false, model: ORDER })
    // 如果附近有订单就给每一个订单加一个distance字段，好让前端调用直接渲染
    if (result) {
        // 给每个订单添加一个到骑手的距离
        /**
         *  由于处理数据是个异步过程所以用到了promise
         *  很麻烦的一点是直接打印result会显示你查询到的内容
         *  但是如果打印如下的单个item就会发现他其实很复杂的一个对象，所以直接向result数组插入是没有任何意义的他具体的数据在datavalues中
         */
        var time = new Promise((resolve, reject) => {
            for (let item of result) {
                item.dataValues.distance = Distance(latitude, longitude, item.latitude, item.longitude)
            }
            resolve(result)
        })
        // await返回数据
        ctx.rest({
            data: await time.then(res => {
                return res
            })
        })

    } else {
        ctx.rest({
            code: '11002',
            message: 'There are no new orders nearby'
        })
    }
}


async function takeOrder(ctx, next) {
    let {
        email,
        orderid
    } = ctx.query
    // 获取到骑手的email，然后将骑手的email加到订单的emailworker中
    const emailworker = ctx.getEmail().email
    // 这里应该用的是订单id，但是没有生成
    let result = ORDER.findAll({
        email: email,
        orderid: orderid
    })
    // 如果查询到了结果
    if (result) {
        result.emailworker = emailworker
        // 将骑手的email加入到该订单中
        result.save()
            .then(res => {
                ctx.rest({
                    code: '1',
                    message: 'OK',
                    data: {
                        res
                    }
                })
            })
            .catch(err => {
                console.log(err)
            })
    } else {
        ctx.rest({
            code: '11003',
            message: 'email or orderid is incorrent'
        })
    }
}

// 获取用户所有的订单
/**
 * 获取到订单之后分三种
 * 1，如果emailworker为空代表下单了还没有人接单
 * 2，如果emailworker不为空但是completed为false代表有人接了单但是还没有完成
 * 3，如果emailworker不为空且completed为true代表已完成的订单
 */
async function getUserOrder(ctx, next) {

    let email = ctx.getEmail()
    let result = await ORDER.findAll({
        where: {
            email: email,
        }
    })
    if (result.length > 0) {
        ctx.rest({
            code: '1',
            message: 'Query OK',
            data: {
                result
            }
        })
    } else {
        ctx.rest({
            code: '11101',
            message: 'user has not order'
        })
    }
}

async function updateUserOrder(ctx, next) {
    // 这里应该是放在请求的路径中直接把订单号传过来利用update
    // 这个是获取附加在路径后面：后面的参数也就是user/:orderid
    let orderid = ctx.params.orderid
    let paramsKeys = Object.keys(ctx.request.body)
    let paramsVlaues = Object.keys(ctx.request.body)
    let result = await ORDER.findOne({
        where: {
            orderid: orderid
        }
    })
    // 修改这次更新的时间
    result.updatedAt = Date.now()
    // 直接遍历需要修改的属性，省去了全部重新赋值
    for (let i in paramsKeys) {
        result[i] = ctx.request.body[i]
    }
    // 保存修改
    result.save()
    ctx.rest({
        code: '1',
        message: 'change OK'
    })
}


/**
 * 
 * @param {double} lat1 骑手的经度
 * @param {double} lng1 骑手的纬度
 * @param {double} lat2 订单的经度
 * @param {double} lng2 订单的纬度
 */
function Distance(lat1, lng1, lat2, lng2) {
    var radLat1 = lat1 * Math.PI / 180.0;
    var radLat2 = lat2 * Math.PI / 180.0;
    var a = radLat1 - radLat2;
    var b = lng1 * Math.PI / 180.0 - lng2 * Math.PI / 180.0;
    var s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
        Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
    s = s * 6378.137;// EARTH_RADIUS;
    s = Math.round(s * 10000) / 10000;
    return s;
}


module.exports = {
    'POST /api/user/pubOrders': pubOrders,
    'GET /api/delivery/getDliOrders': getDliOrders,
    'GET /api/delivery/takeOrders': takeOrder,
    'GET /api/user/getUserOrder': getUserOrder,
    'UPDATE /api/user/updateUserOrder': updateUserOrder
}

/**
 * 我认为的订单逻辑：
 * 用户通过签到，充值等任务或者活动获得相应的积分，而这些积分可以被用于下单，每一单按多少垃圾等比例的需要多少积分
 * 而骑手可以通过垃圾的多少（具体是可回收的有多少）获得相应的积分，骑手端的积分可以转化成相应的收入，但是用户端是不行的
 */