const AdminModel = require('../models/AdminModel');

module.exports = class AdminController {

    // a protected model method
    _model;

    // a constructor
    constructor() {

        this._model = new AdminModel();
    }

    async loginAdmin(req, res) {

        let user = req.body.username;
        let pass = req.body.password;
        const data = await this._model.loginAdmin();
        res.send(JSON.stringify(data));

    }

    addNewDepartment(req, res) {

        let dept = req.body.department;
        let desc = req.body.description;

        const check = this._model.alwaysInsertToDb({ depName: dept, description: desc }, "departments");
        res.render('admin/add-department', { title: 'Add Department', message: 'New Department Successfully Added', alert: 'alert-info' });
        // res.send("sucess");

    }

    async fetchAllDepartments() {
        const data = await this._model.fetchAllDepartments();
        // console.log(data);
        return data;
    }

    async fetchDepartmentById(id) {
        const data = await this._model.fetchDepartmentById(id);
        // console.log(data);
        return data;
    }


    async updateDepartment(req, res) {

        let dept = req.body.department;
        let desc = req.body.description;
        let dep = req.body.depId;
        var id = atob(dep);

        const check = this._model.generateUpdateQuery({ depName: dept, description: desc }, "departments", "depId", id);
        // res.render('admin/manage-departments', {title:'Add Department',message:'Department Successfully Update',alert:'alert-info'});
        const depts = await this.fetchAllDepartments();
        // console.log(depts) ;
        res.render('admin/manage-departments', { title: 'Manage Departments', depts, message: 'Department Successfully Update', alert: 'alert-info' });
    }

    async deleteDepartment(req, res) {

        let dep = req.body.id;
        const data = await this._model.deleteDepartment(dep);
        res.send(JSON.stringify(data));

        // return data;

    }


}