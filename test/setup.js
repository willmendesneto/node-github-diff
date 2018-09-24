if (process.env.NODE_ENV === 'test-unit') {
  const nock = require('nock');
  nock.disableNetConnect();

  require('./fixtures/github-api');
}
