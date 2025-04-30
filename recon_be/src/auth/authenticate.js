
const authenticate = async (req, res, next) => {

    console.log(req.originalUrl)
  // If the root endpoint is accessed
  if (req.originalUrl === '/') {
    return res.status(401).json({
      message: 'Nothing to see here, This is an API endpoint.',
    });
  }

  await next();
};

function resolveToken(header) {
  if (!header || !header.authorization) {
    return false;
  }

  const parts = header.authorization.split(' ');

  if (parts.length === 2) {
    const scheme = parts[0];
    const credentials = parts[1];

    if (/^Bearer$/i.test(scheme)) {
      return credentials;
    }
  }

  return false;
}

module.exports = authenticate;
