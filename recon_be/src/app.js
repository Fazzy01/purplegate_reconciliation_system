// const express = require("express");
// const cors = require("cors");
// const multer = require('multer');
// const config = require('../config/index');
// const authenticate = require('./auth/authenticate')
// const MainController = require("./controllers/mainController");



// const application = express();

// class Server extends MainController {

//         constructor(app) {
//                 super();
//                 this.config(app);
//         }

//         config(app) {
//             app.use('/docs',express.static('docs'))
//             app.use(cors({ credentials: true }))
//             app.use(express.json())
//             app.use(authenticate)




//         }
// }

// new Server(application);
// const server = application.listen(config.app.server.port, () => {
//     console.log(`App running on port ${config.app.server.port}`);
//   });

// server.js or wherever your Server class is defined
const express = require("express");
const cors = require("cors");
const config = require('../config/index');
const authenticate = require('./auth/authenticate');
const MainController = require("./controllers/mainController");
const reconcileRoutes = require("./routes/reconcileRoutes");
const fs = require('fs');
const path = require('path');


// Create uploads directory if it doesn't exist
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const application = express();
class Server extends MainController {
  constructor(app) {
    super();
    this.config(app);
    this.routes(app);
  }

  config(app) {
    app.use('/docs', express.static('docs'));
    app.use(cors({ credentials: true }));
    app.use(express.json());
    app.use(authenticate);

  }

  routes(app) {
    app.use('/api/reconcile', reconcileRoutes);


  }
}

new Server(application);
const server = application.listen(config.app.server.port, () => {
    console.log(`App running on port ${config.app.server.port}`);
  });