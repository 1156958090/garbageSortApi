var AipImageClassifyClient = require("../src/AipImageClassify");

// 设置APPID/AK/SK
var APP_ID = "17208555";
var API_KEY = "mGQFGw1rYScrpt93cwNg57YS";
var SECRET_KEY = "DG5TIbYzU3GGGBki8GbFagSFdqqHra1z";

var Request = require('request')
// 新建一个对象，建议只保存一个对象调用服务接口
var client = new AipImageClassifyClient(APP_ID, API_KEY, SECRET_KEY);

var fs = require('fs');



// // 如果有可选参数
// var options = {};
// options["baike_num"] = "5";

// // 带参数调用通用物体识别
// client.advancedGeneral(image, options).then(function(result) {
//     console.log(result.result[0].keyword);
// }).catch(function(err) {
//     // 如果发生网络错误
//     console.log(err);
// });;

async function garbageSort(ctx, next) {
    var file = ctx.request.files.file
    var image = fs.readFileSync(file.path).toString("base64");
    var a = new Promise((resolve, reject) => {
        client.advancedGeneral(image).then(function (result) {
            console.log(result)
            Request.get({
                url:'https://service.xiaoyuan.net.cn/garbage/index/search?kw=' + encodeURI(result.result[0].keyword), 
                timeout:3000,
            },function (err, res, body) {
                console.log('error:', err); // Print the error if one occurred
                console.log('statusCode:', res && res.statusCode); // Print the response status code if a response was received
                console.log('body:', body); // Print the HTML for the Google homepage.
                resolve(JSON.stringify(body))
            })
            
        }).catch(function (err) {
            // 如果发生网络错误
            console.log(err);
        });
    })
    var result = await a.then(res => {
        return res
    })
    ctx.rest({
        code: '1',
        message: 'OK',
        data: JSON.stringify(result) 
    })
}


module.exports = {
    'POST /api/user/garbageSort': garbageSort
}