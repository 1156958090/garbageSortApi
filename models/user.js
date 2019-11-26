const db = require('../db')
module.exports = db.defineModel('users', {
    email: db.STRING(50),
    password:db.STRING(50),
    gender: db.ENUM('男','女'),
}, {
        timestamps: false
    });


