const db = require('../database');


module.exports = class AdminModel {

    // check if a user exists as admin
    isUser(username, pass) {
        var checker = "";

        return new Promise((resolve, reject) => {
            var query = "SELECT * FROM sysusers WHERE sysUsername=? AND sysToken=? ;";
            var params = [username, pass];
            db.query(query, params, function (err, result) {
                // console.log(result) ;
                if (err) {
                    // console.log(err);
                    return reject(err);
                }
                else if (result.length > 0) {
                    // console.log(session);
                    return resolve(result);
                    // console.log("user exist");
                }
                else {
                    return resolve(1);
                }

            });
        });
        // return checker;
    }

    //  PREVENT SQL INJECTION
    // function for inserting into DB
    alwaysInsertToDb(data, tableName) {
        let part1 = `INSERT INTO ${tableName} (`;
        let part2 = ")",
            part3 = "VALUES (",
            part4 = ")";
        let part6 = "?";
        let tableKeys = "";

        var tableValues = [];
        for (let key in data) {
            tableKeys += `${key},`;
            tableValues.push(data[key]);
        }

        tableKeys = tableKeys.slice(0, -1);
        let sql = `${part1}${tableKeys}${part2} ${part3}${part6}${part4};`;

        // for query binding against SQL injection
        db.query(sql, [tableValues], function (err, result) {
            if (err) {
                console.log(err);
            }
            console.log("inserted successfully and last id is:" + result.insertId);
        });

        return 1;

        // return sql;
        // console.log(sql);

    }

    //  WITH PREVENT SQL INJECTION
    // function for updating a value in  DB Regardless of the table
    generateUpdateQuery(data, tableName, clauseKey, clauseValue) {
        let part1 = `UPDATE ${tableName} SET`;
        let part2 = `WHERE ${clauseKey} = ?;`;
        let updateString = "";
        for (let key in data) {
            updateString += `${key} = '${data[key]}',`;
        }
        updateString = updateString.slice(0, -1);
        let query = `${part1} ${updateString} ${part2}`;

        db.query(query, [clauseValue], function (err, result) {
            if (err) {
                console.log(err);
            }
            console.log("inserted successfully and last id is:" + result.insertId);
        });
        return 1;
        // console.log(query) ;
    }


    // CORE FUNCTIONS FOR FETCHING DATA DON'T TOUCH WITH NO PARAM
    async doQuery(queryToDo) {
        return new Promise((resolve, reject) => {
            let query = queryToDo;
            var data = db.query(query, function (err, rows) {

                if (rows === undefined) {
                    reject(new Error("Error rows is undefined"));
                } else {
                    resolve(rows);
                }

            });

        });

    }

    // Admin Login
    loginAdmin() {

        return 0;
    }
    // fetch all department
    fetchAllDepartments() {
        var query = "SELECT * FROM departments";
        return this.doQuery(query)
    }

    // fetch all department by Id
    fetchDepartmentById(id) {

        var depId = parseInt(atob(id));
        return new Promise((resolve, reject) => {
            var query = "SELECT * FROM departments WHERE depId=?";
            var param = [depId];
            var data = db.query(query, param, function (err, row) {

                if (row === undefined) {
                    reject(new Error("Error rows is undefined"));
                } else {
                    resolve(row);
                }

            });

        });
    }

    // delete department by id
    deleteDepartment(id) {

        var depId = parseInt(atob(id));
        var query = "DELETE FROM departments WHERE depId=?";
        var param = [depId];
        var data = db.query(query, param, function (err, row) {

            if (err) {
                console.log(err);
                return 1;
            } else {
                return 0;
            }

        });


    }






}