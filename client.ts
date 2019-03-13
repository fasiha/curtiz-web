import * as curtiz from 'curtiz';
import React, {useEffect, useReducer, useState} from 'react';
import ReactDOM from 'react-dom';

import * as gitio from './gitio';

const ce = React.createElement;

function mapRight<T, U>(v: T[], mapper: (x: T, i?: number, v?: T[]) => U): U[] {
  const N = v.length;
  return Array.from(Array(N), (_, i) => mapper(v[N - i - 1], N - i - 1, v));
}
function* enumerate<T>(v: T[]|IterableIterator<T>, n: number = 0): IterableIterator<[number, T]> {
  for (let x of v) { yield [n++, x]; }
}
function flatten1(vov: any[][]): any[] { return vov.reduce((old, curr) => old.concat(curr), []); }

function parseFileContents(text: string) { return curtiz.markdown.textToBlocks(text); }
function contentsToBestQuiz(contents: curtiz.markdown.Content[][], randomize: boolean) {
  const findBestQuiz = curtiz.markdown.findBestQuiz;
  const contentToLearned: (content: curtiz.markdown.Content[]) => curtiz.markdown.LozengeBlock[] = content =>
      content.filter(o => o instanceof curtiz.markdown.LozengeBlock && o.learned()) as curtiz.markdown.LozengeBlock[];

  const bestQuizzes = contents.map(content => findBestQuiz(contentToLearned(content), randomize).finalQuizzable) as
                      curtiz.markdown.LozengeBlock[];

  return findBestQuiz(bestQuizzes, randomize);
}

type Mode = 'quiz'|'learn';
type FilesContents = Map<string, {checked?: boolean, content: curtiz.markdown.Content[]}>;
let FILESCONTENTS: FilesContents = new Map();
type BestQuiz = {
  finalQuiz: curtiz.markdown.Quiz,
  finalQuizzable: curtiz.markdown.LozengeBlock,
  finalPrediction: curtiz.markdown.Predicted,
  finalIndex: number
};
function Quiz(props: {allDoneFunc: () => void, bestQuiz: BestQuiz}) {
  const [answer, setAnswer] = useState('');
  const [finalSummaries, setFinalSummaries] = useState([] as string[]);
  const {contexts, clozes} = props.bestQuiz.finalQuiz.preQuiz();
  return ce(
      'div',
      null,
      ce('p', null, contexts.map(o => o ? o : '___').join('')),
      ce(
          'form',
          {
            onSubmit: (e) => {
              e.preventDefault();
              let now: Date = new Date();
              let scale = 1;
              let correct =
                  props.bestQuiz.finalQuizzable.postQuiz(props.bestQuiz.finalQuiz, clozes, [answer], now, scale);
              let summary = props.bestQuiz.finalQuizzable.header;
              const init = curtiz.markdown.SentenceBlock.init;
              summary = summary.slice(summary.indexOf(init) + init.length);
              const finalSummary = correct ? ('💥 🔥 🎆 🎇 👏 🙌 👍 👌! ' + summary)
                                           : (`😭 🙅‍♀️ 🙅‍♂️ 👎 🤬. ${answer} ∉ 【${
                                                 clozes.join(', ')}】 for ${summary}`);
              setFinalSummaries(finalSummaries.concat(finalSummary));
              props.allDoneFunc();
              setAnswer('');
            }
          },
          ce(
              'label',
              null,
              'Answer:',
              ce('input', {type: 'text', value: answer, onChange: e => setAnswer(e.target.value)}),
              ),
          ce('input', {type: 'submit', value: 'Submit'}),
          ),
      ce('ul', null, ...mapRight(finalSummaries, s => ce('li', null, s))),
  );
}

function ModeSelect(props: {tellparent: (mode: Mode) => void}) {
  return ce(
      'div',
      null,
      ce('input', {
        type: 'radio',
        id: 'modeQuiz',
        name: 'quizSelect',
        value: 'modeQuiz',
        defaultChecked: true,
        onClick: e => props.tellparent('quiz')
      }),
      ce('label', {htmlFor: 'modeQuiz'}, 'Quiz'),
      ce('input', {
        type: 'radio',
        id: 'modeLearn',
        name: 'quizSelect',
        value: 'modeLearn',
        onClick: e => props.tellparent('learn')
      }),
      ce('label', {htmlFor: 'modeLearn'}, 'Learn'),
  )
}

function IzumiSession(props: {filesOn: string[], user: string, token: string}) {
  let contents: curtiz.markdown.Content[][] = [];
  for (let f of props.filesOn) {
    let val = FILESCONTENTS.get(f);
    if (val) { contents.push(val.content); }
  }
  const [questionNumber, setQuestionNumber] = useState(0);
  const [mode, setMode] = useState('quiz' as Mode);

  let modeElement;
  if (props.filesOn.length > 0) {
    if (mode === 'quiz') {
      const {finalQuiz, finalQuizzable: finalLozengeBlock, finalPrediction, finalIndex} =
          contentsToBestQuiz(contents, false);
      if (!(finalQuiz && finalLozengeBlock && finalPrediction && typeof finalIndex === 'number')) {
        modeElement = ce('h1', null, 'No quizzes found. Learn something!');
      } else {
        modeElement = ce(
            'div',
            null,
            ce(Quiz, {
              allDoneFunc: async () => {
                setQuestionNumber(questionNumber + 1);
                let res = await gitio.writeFileCommit(props.filesOn[finalIndex],
                                                      curtiz.markdown.contentToString(contents[finalIndex]),
                                                      'Commit quiz, ' + (new Date()).toISOString());
                console.log('commit res', res);
                if (props.user && props.token) {
                  let err = await gitio.commit(props.user, props.token);
                  console.log('push err', err);
                }
              },
              bestQuiz: {finalQuiz, finalQuizzable: finalLozengeBlock, finalPrediction, finalIndex}
            }),
        );
      }
    } else {
      let finalIndex: number = -1;
      let toLearn: curtiz.markdown.LozengeBlock|undefined;
      for (const [idx, content] of enumerate(contents)) {
        finalIndex = idx;
        toLearn = content.find(o => o instanceof curtiz.markdown.LozengeBlock &&
                                    !o.learned()) as (curtiz.markdown.LozengeBlock | undefined);
        if (toLearn) { break; }
      }
      modeElement = ce(Learn, {
        fileIndex: finalIndex,
        toLearn,
        allDoneFunc: async () => {
          setQuestionNumber(questionNumber + 1);
          let res = await gitio.writeFileCommit(props.filesOn[finalIndex],
                                                curtiz.markdown.contentToString(contents[finalIndex]),
                                                'Commit learn, ' + (new Date()).toISOString());
          console.log('commit res', res);
          if (props.user && props.token) {
            let err = await gitio.commit(props.user, props.token);
            console.log('push err', err);
          }
        }
      });
    }
  } else {
    modeElement = ce('h1', null, 'Select one or more files!');
  }
  return ce('div', null, ce(ModeSelect, {
              tellparent: (newMode: Mode) => {
                if (newMode !== mode) { setMode(newMode); }
              }
            }),
            modeElement);
}

function Learn(props: {toLearn: curtiz.markdown.LozengeBlock|undefined, fileIndex: number, allDoneFunc: () => void}) {
  const [input, setInput] = useState('1');
  const toLearn = props.toLearn;
  if (!toLearn) { return ce('h1', null, 'Nothing to learn!'); }
  if (toLearn instanceof curtiz.markdown.SentenceBlock) {
    return ce(
        'div',
        null,
        ce('p', null, `Learn this: ${toLearn.sentence}, ${toLearn.reading}, ${toLearn.translation}`),
        ce(
            'form',
            {
              onSubmit: e => {
                e.preventDefault();
                let scale = parseFloat(input) || 1;
                toLearn.learn(new Date(), scale);
                props.allDoneFunc();
                setInput('1');
              }
            },
            ce(
                'label',
                null,
                'Scale: ',
                ce('input', {type: 'text', value: input, onChange: e => setInput(e.target.value)}),
                ),
            ce('input', {type: 'submit', value: 'Learn'}),
            ),
    );
  } else {
    return ce('h1', null, 'Error! Unknown type to learn.');
  }
}

function Login(props: {tellparent: (a: string, b: string, c: string) => void}) {
  const [url, setURL] = useState('');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  return ce(
      'div',
      null,
      ce(
          'form',
          {
            onSubmit: e => {
              e.preventDefault();
              props.tellparent(url, username, token);
            }
          },
          ce('label', null, 'URL: ', ce('input', {type: 'text', value: url, onChange: e => setURL(e.target.value)})),
          ce('label', null,
             'Username: ', ce('input', {type: 'text', value: username, onChange: e => setUsername(e.target.value)})),
          ce('label', null,
             'token: ', ce('input', {type: 'password', value: token, onChange: e => setToken(e.target.value)})),
          ce('input', {type: 'submit', value: 'Login'}),
          ),
  );
}

async function initializeGit(loginfo: string[], setSetupComplete: (x: boolean) => void,
                             setFilesList: (x: string[]) => void) {
  if (!loginfo[0]) { return; }
  console.log('RUNNING SETUP');
  await gitio.setup(loginfo[0]);
  let ls = (await gitio.ls()).filter(s => s.endsWith('.md'));
  let contents = await Promise.all(ls.map(f => gitio.readFile(f)));

  let map: FilesContents = new Map();
  ls.forEach((f, i) => map.set(f, {content: parseFileContents(contents[i])}));
  FILESCONTENTS = map;

  setFilesList(ls);
  setSetupComplete(true);
}

function Fileslist(props: {ls: string[], tellparent: (file: string, checked: boolean) => void}) {
  let flat = flatten1(props.ls.map(f => [ce('input', {
                                           type: 'checkbox',
                                           id: 'check-' + f,
                                           name: 'check-' + f,
                                           onClick: e => { props.tellparent(f, (e.target as any).checked) }
                                         }),
                                         ce('label', {htmlFor: 'check-' + f}, f)]));
  return ce('div', null, ...flat);
}

function Git(props: any) {
  const [loginfo, setLonginfo] = useState(["", "", ""] as string[]);
  const [setupComplete, setSetupComplete] = useState(false);
  const [filesList, setFilesList] = useState([] as string[]);
  const [filesOnList, setFilesOnList] = useState([] as string[]);
  // console.log(loginfo, setupComplete, filesContents);
  useEffect(() => { initializeGit(loginfo, setSetupComplete, setFilesList); }, [...loginfo]);
  return ce(
      'div',
      null,
      ce(Login, {tellparent: (...v: string[]) => { setLonginfo(v); }}),
      ce(Fileslist, {
        tellparent: (file: string, checked: boolean) => {
          let val = FILESCONTENTS.get(file);
          if (val) { val.checked = checked; }
          setFilesOnList([...FILESCONTENTS.keys()]
                             .filter(key => {
                               let v = FILESCONTENTS.get(key);
                               return v && v.checked;
                             })
                             .sort());
        },
        ls: filesList
      }),
      setupComplete ? ce(IzumiSession, {filesOn: filesOnList, user: loginfo[1], token: loginfo[2]}) : '',
  );
}

ReactDOM.render(ce(Git), document.getElementById('root'));
