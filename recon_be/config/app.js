const config = {
  publicRoutes: [
    '/',
    '/user/1',
    '/user/',
    '/user/create',
    '/user/token/create',
    '/user/exist/email',
    '/user/exist/username',
    '/user/password/reset',
    '/user/logout',
    '/docs/*',
    // others public routes deleted,

    '/reconcile',
  ],
  privateRoutes: [
    '/admin/create',
  ],

  server: {
    url: 'http://localhost:3400',
    port: 3400,
  },

}

module.exports = config;