const assert = require('assert');
const nodeGithubDiff = require('./../index');

const nock = require('nock');
const fs = require('fs');
const path = require('path');

describe('Application bootstrap entry point', () => {
  let gitPatches;
  before(async () => {
    if (process.env.NOCK_RECORD === 'true') {
      nock.recorder.rec({
        dont_print: true,
      });
    }

    const params = {
      repository: 'willmendesneto/generator-update-yeoman-test',
      base: 'v0.0.3',
      head: 'v0.0.5',
    };

    if (process.env.GITHUB_TOKEN) {
      params.token = process.env.GITHUB_TOKEN;
    }

    gitPatches = await nodeGithubDiff(params);
  });

  after(() => {
    if (process.env.NOCK_RECORD === 'true') {
      var fixtures = nock.recorder.play();

      var fixtureContent = `const nock = require('nock');

${fixtures}

`;
      fs.writeFileSync(
        `${path.resolve(path.join(__dirname, './fixtures'))}/github-api.js`,
        fixtureContent.replace(new RegExp(';,', 'g'), ';'),
        'utf8'
      );
    }
  });

  it('should return all the expected patches', () => {
    assert.equal(gitPatches.length, 7);
  });

  it('should return data for the modified file', () => {
    const renamedFile = gitPatches[0];
    const expectedKeys = ['filename', 'patch', 'status', 'header', 'fileA', 'fileB'];
    assert.deepStrictEqual(Object.keys(renamedFile), expectedKeys);
  });

  it('should return data for the renamed file', () => {
    const renamedFile = gitPatches[1];
    const expectedKeys = ['filename', 'patch', 'status', 'header', 'fileA'];
    assert.deepStrictEqual(Object.keys(renamedFile), expectedKeys);
  });

  it('should return data for the added file', () => {
    const renamedFile = gitPatches[3];
    const expectedKeys = ['filename', 'patch', 'status', 'header', 'fileB'];
    assert.deepStrictEqual(Object.keys(renamedFile), expectedKeys);
  });
});
