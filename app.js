const Koa = require('koa2')
const koaBody = require('koa-body') // body解析模块
const jwtKoa = require('koa-jwt')      // 用于路由权限控制
const jwt = require('jsonwebtoken') // 用于签发、解析`token`
const controller = require('./controller') // 路由控制模块
const restify = require('./rest').restify
const path = require('path')
const dir = path.join(__dirname + '/imageTmp')
const app = new Koa()


// 声明不需要token的接口
app.use(
    jwtKoa({
        secret: 'thisIsSecret'
    }).unless({
        path: [
            /^\/api\/user\/login/,
            /^\/api\/user\/register/,
            /^\/api\/user\/getVfCode/,
            /^\/api\/user\/garbageSort/,
            /^\/api\/user\/getVfCodeToFind/,
            /^\/api\/user\/getPwdBack/,
			/^\/hello/
        ]
    })
);
//检查接口是否是否通过authorization验证
app.use((ctx, next) => {
    if (ctx.header && ctx.header.authorization) {
        const parts = ctx.header.authorization.split(' ');
        if (parts.length === 2) {
            //取出token
            const scheme = parts[0];
            const token = parts[1];
            if (/^Bearer$/i.test(scheme)) {
                //jwt.verify方法验证token是否有效
                jwt.verify(token, 'thisIsSecret', function (err, decoded) {
                    // 有效的话就把解码出来的值放到request中方便之后的路由使用
                    ctx.getEmail = () => {
                        return {
                            email: decoded.email
                        }
                    }
                    // 过期了之后就重新发送token
                    if (err && err.name == 'TokenExpiredError') {
                        // 目前用的方法是直接解码获取email，再次生成token发送，按理来说需要refresh_token
                        let data = jwt.decode(token)
                        let tokenAgain = jwt.sign({ email: data.email }, 'thisIsSecret', { expiresIn: 60 * 60 * 4 })
                        ctx.response.type = 'application/json';
                        ctx.body = {
                            code: '11111',
                            message: 'token expried',
                            data: {
                                token: tokenAgain,
                                exprie: '4h'
                            }
                        }
                    }
                });
            }
        }
    }

    return next().catch(err => {
        if (err.status === 401) {
            ctx.status = 401;
            ctx.body =
                'Protected resource, use Authorization header to get access\n';
        } else {
            throw err;
        }
    });
});
app.use(koaBody({
    multipart: true,
    formidable:
    {
        uploadDir: dir,
        maxFieldsSize: 200 * 24 * 1024
    }
}))
app.use(restify())




app.use(controller())

app.listen(3000, () => {
    console.log('Please interview http://localhost:3000')
})