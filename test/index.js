const assert = require('assert');
const nodeGithubDiff = require('./../index');

describe('Application bootstrap entry point', () => {
  let gitPatches;
  before(async () => {
    gitPatches = await nodeGithubDiff({
      repository: 'willmendesneto/generator-update-yeoman-test',
      base: 'v0.0.3',
      head: 'v0.0.5',
    });
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
