const db = require('../db')
module.exports = db.defineModel('orders', {
    orderid:db.BIGINT,
    email: db.STRING(50),
    emailworker: db.STRING(50),
    address: db.STRING(70),
    contact: db.STRING(20),
    telephone: db.BIGINT,
    taketime: db.BIGINT,
    overtime: db.BIGINT,
    completed: db.BIGINT,
    city:db.STRING(50),
    content: db.STRING(70),
    weight: db.INTEGER,
    remarks: db.STRING(70),
    longitude:db.BIGINT,
    latitude:db.BIGINT,
}, {
    timestamps: false
});


