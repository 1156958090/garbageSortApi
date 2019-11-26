const db = require('../db')
module.exports = db.defineModel('vfcodes', {
    email: db.STRING(50),
    code:db.INTEGER
}, {
        timestamps: false
    });


