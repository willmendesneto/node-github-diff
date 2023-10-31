const { Octokit } = require('@octokit/rest');
const isBinary = require('is-binary-buffer');

const atob = (base64encoded) => {
  const decodedFile = Buffer.from(base64encoded, 'base64');

  return isBinary(decodedFile) ? decodedFile : decodedFile.toString('utf8');
};

const buildHeader = (fileA, fileB) => `diff --git a/${fileA} b/${fileB}\n` + `--- a/${fileA}\n` + `+++ b/${fileB}\n`;

const getContent = async (github, owner, repo, path, commit) => {
  try {
    const { data } = await github.repos.getContent({
      owner,
      repo,
      path,
      ref: commit,
    });

    return data.content;
  } catch (err) {
    try {
      const apiError = JSON.parse(err);
      if (apiError.errors.find((error) => error.code === 'too_large')) {
        const gitTree = await github.gitdata.getTree({
          owner,
          repo,
          // More details why recursive is required in
          // https://developer.github.com/v3/git/trees/#get-a-tree-recursively
          recursive: true,
          sha: commit,
        });

        const { sha } = gitTree.tree.find((file) => file.path === path) || {};
        const { content } = await github.gitdata.getBlob({
          owner,
          repo,
          sha,
        });

        return content;
      }

      throw err;
    } catch (parseError) {
      throw new Error(`Unable to get content for ${path} @commit:${commit}. ${err}`);
    }
  }
};

const getContentByStatus = async ({ github, owner, repo, base, head, file }) => {
  const { filename, patch, status } = file;
  let content;
  // Get the content for the files
  if (status === 'removed') {
    content = await getContent(github, owner, repo, filename, base);

    return {
      filename,
      patch,
      status,
      header: buildHeader(filename, filename),
      fileA: atob(content),
    };
  } else if (status === 'added') {
    content = await getContent(github, owner, repo, filename, head);

    return {
      filename,
      patch,
      status,
      header: buildHeader(filename, filename),
      fileB: atob(content),
    };
  } else if (status === 'modified') {
    const [fileA, fileB] = await Promise.all([
      getContent(github, owner, repo, filename, base),
      getContent(github, owner, repo, filename, head),
    ]);

    return {
      filename,
      patch,
      status,
      header: buildHeader(filename, filename),
      fileA: atob(fileA),
      fileB: atob(fileB),
    };
  } else if (status === 'renamed') {
    content = await getContent(github, owner, repo, filename, head);
    const decodedFile = atob(content);
    const previousFilename = file.previous_filename;
    const header = buildHeader(filename, previousFilename);

    return {
      filename,
      patch,
      status,
      header,
      previousFilename,
      fileA: decodedFile,
      fileB: decodedFile,
    };
  }

  return {
    filename,
    patch,
    status,
    header: buildHeader(filename, filename),
  };
};

const comparePackageVersions = async (github, owner, repo, base, head) => {
  try {
    const { data } = await github.repos.compareCommits({
      owner,
      repo,
      base,
      head,
    });

    const commits = await Promise.all(
      data.files.map((file) => {
        const content = {
          github,
          owner,
          repo,
          base,
          head,
          file,
        };

        return getContentByStatus(content);
      })
    );

    return commits;
  } catch (err) {
    throw new Error(`Unable to access the github repository for '${repo}'. ${err}`);
  }
};

const nodeGithubDiff = async ({ repository, base, head, githubToken }) => {
  try {
    // Setup the github api
    const github = new Octokit({
      auth: githubToken || undefined,
      baseUrl: 'https://api.github.com',
      userAgent: 'node-github-diff',
      request: {
        agent: false,
        timeout: 0,
      },
    });

    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new Error('Repository param should have "owner/repo" pattern');
    }

    const data = await comparePackageVersions(github, owner, repo, base, head);

    return data;
  } catch (error) {
    throw error;
  }
};

module.exports = nodeGithubDiff;
