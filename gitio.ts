import pify from 'pify';
const LightningFS = require('@isomorphic-git/lightning-fs');
const git = require("isomorphic-git");

const dir = '/tutorial';
const CORSPROXY = 'https://cors.isomorphic-git.org';

let fs = new LightningFS('fs', {wipe: true});
let pfs = pify(fs);
git.plugins.set('fs', fs);

export async function setup(url: string) {
  fs = new LightningFS('fs', {wipe: true});
  pfs = pify(fs);
  git.plugins.set('fs', fs);
  await pfs.mkdir(dir);
  if (!url) { return git.init({dir}); }
  return git.clone({dir, corsProxy: CORSPROXY, url, ref: 'master', singleBranch: true, depth: 1});
}

export async function push(username: string, token: string) {
  let pushres = await git.push({dir, username, token});
  return pushres.errors;
}

export async function ls(filepath: string = ''): Promise<string[]> {
  return pfs.readdir(filepath ? `${dir}/${filepath}`.replace(/\/+$/, '') : dir);
}

export async function readFile(filepath: string): Promise<string> { return pfs.readFile(`${dir}/${filepath}`, 'utf8'); }

export async function writeFileCommit(filepath: string, contents: string, message: string, name: string = 'Me',
                                      email: string = 'mrtest@example.com'): Promise<string> {
  await pfs.writeFile(`${dir}/${filepath}`, contents, 'utf8');
  await git.add({dir, filepath});
  return git.commit({dir, message, author: {name, email}});
}

export async function test() {
  let fs = new LightningFS('fs', {wipe: true});
  let pfs = pify(fs);
  git.plugins.set('fs', fs);

  var dir = '/tutorial';
  console.log(dir);
  await pfs.mkdir(dir);
  var initread = await pfs.readdir(dir);
  await git.clone({
    dir,
    corsProxy: 'https://cors.isomorphic-git.org',
    url: 'https://gist.github.com/fasiha/df376f46641a36b7a7d82b931851b7c3',
    ref: 'master',
    singleBranch: true,
    depth: 2
  });

  var finalread = await pfs.readdir(dir);

  var contents = await pfs.readFile(`${dir}/README.md`, 'utf8');
  await pfs.writeFile(`${dir}/README.md`, contents + '\nHello World FROM ISOMORPHIC!', 'utf8');
  await git.add({dir, filepath: 'README.md'});
  let sha = await git.commit(
      {dir, message: 'Commit ' + (new Date()).toISOString(), author: {name: 'Me', email: 'mrtest@example.com'}});
  let pushres: any = {};
  // pusres = await git.push({dir, username: 'fasiha', token: ''});
  let ls = await pfs.readdir(`${dir}/${'.git'}`);
  return [initread, finalread, sha, pushres.errors, ls];
}