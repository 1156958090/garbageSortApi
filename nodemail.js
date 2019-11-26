const nodemailer = require('nodemailer')
//创建一个smtp服务器
const config = {
    host: 'smtp.126.com',
    port: 25,
    auth: {
        user: 'x1156958090@126.com', // 注册的126邮箱账号
        pass: 'caonima123' // 邮箱的授权码
    }
};
// 创建一个SMTP客户端对象
const transporter = nodemailer.createTransport(config);
 
// 暴露发送邮箱的模块
module.exports = function (mail){
    transporter.sendMail(mail, function(error, info){
        if(error) {
            return console.log(error);
        }
        console.log('mail sent:', info.response);
    });
};
