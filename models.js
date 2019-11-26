const fs = require('fs')
const db = require('./db')

let files = fs.readdirSync(__dirname + '/models')

let js_files = files.filter((f)=>{
    return f.endsWith('.js')
}, files)

module.exports = {}

for (let f of js_files) {
    console.log(`import model from file ${f}...`)
    let name = f.substring(0, f.length - 3)
    console.log('scaned model:'+name) // 打印已经扫描到的model
    module.exports[name] = require(__dirname + '/models/' + f)
}

module.exports.sync = () => {
    db.sync()
}