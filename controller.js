
const fs = require('fs')

//匹配路由，实现自动扫描请求挂载
function addMapping(router, mapping) {
    for (var url in mapping) {
        if (url.startsWith('GET ')) {
            var path = url.substring(4);
            router.get(path, mapping[url]);
            console.log(`register URL mapping: GET ${path}`);
        } else if (url.startsWith('POST ')) {
            var path = url.substring(5);
            router.post(path, mapping[url]);
            console.log(`register URL mapping: POST ${path}`);
        } else {
            console.log(`invalid URL: ${url}`);
        }
    }
}
//从controller文件夹下面检索js文件，由于每个文件返回的是一个对象，所以可以直接进行索引利用for循环
function addControllers(router) {
    //同步的读取controller文件夹，由于是在运行是就会执行所以不用担心会有性能问题
    var files = fs.readdirSync(__dirname + '/controller');
    //筛选js结尾的文件
    var js_files = files.filter((f) => {
        return f.endsWith('.js');
    });
    //直接挂载每一个请求的实现操作
    for (var f of js_files) {
        console.log(`process controller: ${f}...`);
        let mapping = require(__dirname + '/controller/' + f);
        addMapping(router, mapping);
    }
}

module.exports = function (dir) {
    let
        controllers_dir = dir || 'controller', // 如果不传参数，扫描目录默认为'controller'
        router = require('koa-router')();
    addControllers(router, controllers_dir);
    return router.routes();
};