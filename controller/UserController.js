const model = require('../models') // 引入数据库操作模块
const jwt = require('jsonwebtoken') // 用于签发、解析`token`
const crypto = require('crypto') // 加密密码
const nodemailer = require('../nodemail')
const JudgeParams = require('./checkParams')
const USER = model.user // 用户数据
const VFCODE = model.vfcode // 验证码数据库
const APIError  = require('../rest').APIError
//注册接口
async function register(ctx, next) {
    let email = ctx.request.body.email
    let password = ctx.request.body.password
    let pwdRepeat = ctx.request.body.pwdRepeat
    let code = ctx.request.body.code
    let md5 = crypto.createHash('md5')
    JudgeParams(ctx.request.body, 4)
    //判断两次的密码是否相同，若相同则注册信息正确
    if (password == pwdRepeat) {
        // 向数据库中查找数据
        let result = await USER.findAll({
            where: {
                email: email
            }
        })
        // 如果查找到了代表注册过了
        if (result.length > 0) {
            ctx.rest({
                code: '10005',
                massage: 'email has been registed'
            })
        } else {
            // 如果数据库中没有该用户那么则鉴定验证码
            ctx.rest({
                code: '1',
                massage: 'registe successfully'
            })
            // 从数据库查询相应的验证码
            let result2 = await VFCODE.findOne({
                where: {
                    email: email
                }
            })
            // if(Date.now() > result2.updatedAt + 300000){
            //     ctx.rest({
            //         code: '10011',
            //         massage: 'verification code has expired'
            //     })
            // }
            if (result2 && result2.code == code) {
                // 判断成功之后加密密码储存进数据库
                password = md5.update(password).digest('hex')
                let res = await USER.create({
                    email: email,
                    password: password,
                    gender: '男'
                })
                console.log(JSON.stringify(res))
            }
            else {
                // 验证码不正确
                ctx.rest({
                    code: '10004',
                    massage: 'verification code is incorrent'
                })
            }
        }
    } else {
        // 返回两次密码不相同
        ctx.rest({
            code: '10010',
            massage: 'twice password is different'
        })
    }
}


//登录接口
async function login(ctx, next) {
    let email = ctx.request.body.email
    let password = ctx.request.body.password
    let md5 = crypto.createHash('md5')
    let token
    JudgeParams(ctx.request.body, 2)
    //加密密码
    password = md5.update(password).digest('hex')
    let result = await USER.findOne({
        where: {
            email: email
        }
    })
    // 如果有结果
    if (result) {
        // 判断密码是否一样
        if (password == result.password) {
            // 创建token
            token = jwt.sign(
                { email: email, }, // 需要加密的payload
                'thisIsSecret', // privateKey
                { expiresIn: 60 * 60 * 4 } // 过期时间
            )
            // 返回token
            ctx.rest({
                code: '1',
                massage: 'login ok',
                data: {
                    token: token,
                    expire: '4h'
                }
            })
            console.log(token)
        } else {
            ctx.rest({
                code: '10006',
                massage: 'password is incorrent'
            })
        }
    } else {
        ctx.rest({
            code: '10009',
            massage: 'email not registered '
        })
    }
}


//找回密码接口
async function getPwdBack(ctx,next) {
    let md5 = crypto.createHash('md5')
    let {
         email,
         code,
         password,
         pwdRepeat} = ctx.request.body
    
    // 加密密码
    password = md5.update(password).digest('hex')
    // 通过邮箱验证码的方式找回密码
    let result = await VFCODE.findOne({
        where: {
            email: email
        }
    })
    if(result && result.code == code)
    {
        let update = await USER.findOne({
            where:{
                email:email
            }
        })
        update.password = password
        update.save()
        // 验证成功，可以修改密码
        ctx.rest({
            code:'10022',
            massage:'password has updated successfully'
        })
    }
    else{
        if(result.code !== code)
        {
            ctx.rest({
                code: '10004',
                massage: 'verification code is incorrent'
            })
        }
        ctx.rest({
            code: '10009',
            massage: 'email not registered '
        })
    }
}


//获取注册验证码接口
async function getVfCode(ctx, next) {
    let email = ctx.request.body.email // 获取到用户输入的email
    let code = MathRand() // 用于生成随机验证码
    JudgeParams(ctx.request.body, 1)
    // 查看用户是否已经注册
    var result = await USER.findAll({
        where: {
            email: email
        }
    });
    // 如果注册了就直接返回已经注册
    if (result.length > 0) {
        ctx.rest({
            code: '10005',
            massage: 'email has been registed'
        })
    } else {
        // 响应成功
        ctx.rest({
            code: '1',
            massage: 'email has passed checktion and eamil send successfully'
        })
        let mail = {
            // 发件人
            from: '<x1156958090@126.com>',
            // 主题
            subject: '请您签收您的验证码',   //邮箱主题
            // 收件人
            to: email,// 前台传过来的邮箱
            // 邮件内容，HTML格式
            text: 'Your verification code is ' + code // 发送验证码
        }
        // 查询是否第一次请求验证码
        let result2 = await VFCODE.findAll({
            where: {
                email: email
            }
        })
        if (result2.length > 0) {
            // 不是第一次就更新验证码
            let data = await VFCODE.findOne({
                where: {
                    email: email,
                }
            })
            data.code = code
            data.updatedAt = Date.now()
            // 将新的验证码储存到数据库中
            data.save()
                .then(res => {
                    console.log(res)
                })
                .catch(err => {
                    console.log(err)
                })
        } else {
            // 是第一次就将信息与将验证码存入数据库
            await VFCODE.create({
                email: email,
                code: code
            })
        }
        nodemailer(mail)
    }
}

// 获取找回密码验证码
// 还没处理没注册的人也能获取验证码
async function getVfCodeToFind(ctx, next) {
    let email = ctx.request.body.email // 获取到用户输入的email
    let code = MathRand() // 用于生成随机验证码
    JudgeParams(ctx.request.body, 1)
    var result = await USER.findAll({
        where: {
            email: email
        }
    });
        // 响应成功
        ctx.rest({
            code: '1',
            massage: 'email has passed checktion and eamil send successfully'
        })
        let mail = {
            // 发件人
            from: '<x1156958090@126.com>',
            // 主题
            subject: '请您签收您的验证码',   //邮箱主题
            // 收件人
            to: email,// 前台传过来的邮箱
            // 邮件内容，HTML格式
            text: 'Your verification code is ' + code // 发送验证码
        }
        // 查询是否第一次请求验证码
        let result2 = await VFCODE.findAll({
            where: {
                email: email
            }
        })
        if (result2.length > 0) {
            // 不是第一次就更新验证码
            let data = await VFCODE.findOne({
                where: {
                    email: email,
                }
            })
            data.code = code
            data.updatedAt = Date.now()
            // 将新的验证码储存到数据库中
            data.save()
                .then(res => {
                    console.log(res)
                })
                .catch(err => {
                    console.log(err)
                })
        } else {
            // 是第一次就将信息与将验证码存入数据库
            await VFCODE.create({
                email: email,
                code: code
            })
        }
        nodemailer(mail)
}
// 随机数生成函数
function MathRand() {
    var num = "";
    for (var i = 0; i < 6; i++) {
        num += Math.floor(Math.random() * 10);
    }
    return num
}

module.exports = {
    'POST /api/user/register': register,
    'POST /api/user/login': login,
    'POST /api/user/getPwdBack': getPwdBack,
    'POST /api/user/getVfCode': getVfCode,
    'POST /api/user/getVfCodeToFind':getVfCodeToFind
}