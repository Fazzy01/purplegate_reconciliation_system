const MainModel = require('../models/MainModel');

module.exports = class MainController {
    _model;

    constructor() {

        this._model = new MainModel();
    }


   async reconcile(req, res) {
    // You can forward to the reconcileController or implement here
    // For example:
    return res.status(501).json({ message: 'Use /api/reconcile endpoints instead' });
  }




}