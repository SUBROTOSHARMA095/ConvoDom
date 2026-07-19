const connectRelationalDB = require('../mysql');

function getUserName(userIds){
    return new Promise((resolve, reject) => {
        if(userIds.length === 0){
            resolve([]);
            return;
        }
        connectRelationalDB.query(
            "SELECT userId, userName FROM users WHERE userId IN (?)", [userIds], (err, results) => {
                if(err){
                    reject(err);
                    return;
                }
                resolve(results);
            }
        );
    });
}

module.exports = getUserName;