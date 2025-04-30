const express = require('express');
const AdminController = require('../controllers/AdminController');

const router = express.Router();


// router.get('/', (req, res) => {
//     // const { userId } = req.session,
//     // req.session.isAuth = true ;
//     // console.log(req.session) ;
//     // console.log(req.session.id) ;
//     res.render('admin/index', {title:'Homepage', data:'data'}) ;
// })

// router.post('/', (req, res) => {
//     req.session.isAuth = true ;
//     const obj = new AdminController() ;
//     obj.loginAdmin(req, res) ;
//     // res.render('admin/index', {title:'Homepage', data:'data'}) ;

// })

router.get('/homepage', (req, res) => {
    req.session.isAuth = true; // initializing session just like making it available for use in a function
    // req.session.cookie.maxAge = 30000 ;
    // console.log(req.session) ;
    // res.render('admin/homepage', {title:'Homepage', data:'data'}) ;

    const userId = req.session;
    const mySysName = req.session.sysName;
    const mySysRole = req.session.sysRole;
    const homeData = {
        title: 'Homepage',
        data: 'data',
        sysName: mySysName,
        sysRole: mySysRole,
    }
    // console.log(userId) ;
    if (userId) {
        try {
            res.render('admin/homepage', homeData);
        }
        catch (e) {
            console.log(e);
            res.sendStatus(404);
        }
    }
});

router.get('/add-department', (req, res) => {

    res.render('admin/add-department', { title: 'Add Department', data: 'data' });

});

router.post('/add-department', (req, res) => {

    const data = new AdminController();
    data.addNewDepartment(req, res);
});

router.get('/manage-departments', async (req, res) => {

    const obj = new AdminController();
    depts = await obj.fetchAllDepartments();
    //  console.log(depts);
    res.render('admin/manage-departments', { title: 'Manage Departments', depts });

});

router.get('/department-details/:apo', async (req, res) => {

    const sending = req.params.apo;

    const obj = new AdminController();
    data = await obj.fetchDepartmentById(sending);
    //  console.log(data[0].depName);
    res.render('admin/department-details', { title: 'Department Details', dept: data });

});

router.post('/department-details', (req, res) => {

    const obj = new AdminController();
    obj.updateDepartment(req, res);
    // res.redirect('/admin/manage-departments') ;
    //  res.render('admin/manage-departments', {title:'Manage Departments', depts}) ;
});

router.post('/delete-department', (req, res) => {
    // console.log(req.body) ;
    const obj = new AdminController();
    obj.deleteDepartment(req, res);

});

// router.get('/login', (req, res) => {

//    const hashedPwd = bcrypt.hash(password, 12) ;  // used to hash password before storing to database
//    const isMatch = await bcrypt.compare(password, database_password );
// });

router.get('/logout', (req, res) => {
    // console.log(req.session) ;
    req.session.destroy(err => {
        if (err) {
            console.log(err);
            return res.redirect('/admin/homepage');
        }
        // sessionStore.close() ;
        res.clearCookie(process.env.SESS_NAME);
        res.redirect('/admin/');
    });

});


module.exports = router;