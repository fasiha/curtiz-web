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

function parseFileContents(text: string) { return curtiz.markdown.textToBlocks(text); }
function contentsToBestQuiz(contents: curtiz.markdown.Content[][], randomize: boolean) {
  const findBestQuiz = curtiz.markdown.findBestQuiz;
  const contentToLearned: (content: curtiz.markdown.Content[]) => curtiz.markdown.LozengeBlock[] = content =>
      content.filter(o => o instanceof curtiz.markdown.LozengeBlock && o.learned()) as curtiz.markdown.LozengeBlock[];

  const bestQuizzes =
      contents.map(content => findBestQuiz(contentToLearned(content), randomize).finalQuizzable).filter(x => !!x) as
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
  const [quizToFinishLearning, setQuizToFinishLearning] = useState(false);
  const {contexts, clozes} = props.bestQuiz.finalQuiz.preQuiz();

  const update = () => {
    let now: Date = new Date();
    let scale = 1;
    // if you learned sub-facts, they'll be "learned" with the scale from
    // Learn React module, and then the following will immediately update it FIXME
    let correct = props.bestQuiz.finalQuizzable.postQuiz(props.bestQuiz.finalQuiz, clozes, [answer], now, scale);
    let summary = props.bestQuiz.finalQuizzable.header;
    const init = curtiz.markdown.SentenceBlock.init;
    summary = summary.slice(summary.indexOf(init) + init.length);
    const finalSummary = correct
                             ? ('🙆‍♂️🙆‍♀️ ' + summary)
                             : (`🙅‍♀️🙅‍♂️. ${answer} ∉ 「${clozes.join(', ')}」 for ${summary}`);
    setFinalSummaries(finalSummaries.concat(finalSummary));
    props.allDoneFunc();
    setAnswer('');
    setQuizToFinishLearning(false);
  };

  let element = ce(
      'div',
      null,
      ce('h1', null, 'Quiz time!'),
      ce('h2', null, contexts.map(o => o ? o : '___').join('')),
      quizToFinishLearning
          ? ce(Learn, {
              partialLearn: true,
              toLearn: props.bestQuiz.finalQuizzable,
              fileIndex: props.bestQuiz.finalIndex,
              allDoneFunc: () => { update(); }
            })
          : ce(
                'form',
                {
                  onSubmit: (e) => {
                    e.preventDefault();
                    if (props.bestQuiz.finalPrediction && props.bestQuiz.finalPrediction.unlearned > 0) {
                      setQuizToFinishLearning(true);
                    } else {
                      update();
                    }
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
  );

  return ce('div', null, element, ce('ul', null, ...mapRight(finalSummaries, s => ce('li', null, s))));
}

function ModeSelect(props: {tellparent: (mode: Mode) => void}) {
  return ce(
      'fieldset',
      null,
      ce('legend', null, 'Mode'),
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
        partialLearn: false,
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

function Learn(props: {
  partialLearn: boolean,
  toLearn: curtiz.markdown.LozengeBlock|undefined,
  fileIndex: number,
  allDoneFunc: () => void
}) {
  const [input, setInput] = useState('1');
  const toLearn = props.toLearn;
  if (!toLearn) { return ce('h1', null, 'Nothing to learn!'); }
  if (toLearn instanceof curtiz.markdown.SentenceBlock) {
    let subbullets = toLearn.bullets.filter(b => b instanceof curtiz.markdown.Quiz && !b.ebisu)
                         .map(q => q.toString())
                         .filter(x => !!x);
    let subbulletsList = ce('ul', null, ...subbullets.map(text => ce('li', null, text)));

    return ce(
        'div',
        null,
        ce('h1', null, props.partialLearn ? 'Oh! New bullets!' : 'Learning time!'),
        ce('h2', null, `${toLearn.sentence}, ${toLearn.reading}, ${toLearn.translation}`),
        subbulletsList,
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
          ce(
              'div',
              {className: 'input-group'},
              ce('label', null, 'URL'),
              ce('input', {
                type: 'text',
                autoCapitalize: 'none',
                autoCorrect: 'off',
                value: url,
                onChange: e => setURL(e.target.value)
              }),
              ),
          ce(
              'div',
              {className: 'input-group'},
              ce('label', null, 'Username'),
              ce('input', {
                type: 'text',
                autoCapitalize: 'none',
                autoCorrect: 'off',
                value: username,
                onChange: e => setUsername(e.target.value)
              }),
              ),
          ce(
              'div',
              {className: 'input-group'},
              ce('label', null, 'Token'),
              ce('input', {type: 'password', value: token, onChange: e => setToken(e.target.value)}),
              ),
          ce('input', {type: 'submit', value: 'Login'}),
          ),
  );
}

async function initializeGit(loginfo: string[], setSetupComplete: (x: boolean) => void,
                             setFilesList: (x: string[]) => void) {
  let offline = !loginfo[0];
  console.log('RUNNING SETUP');
  await gitio.setup(loginfo[0]);

  if (offline) {
    let filename = 'test.md';
    let content = `
# Human Japanese
Vocabulary from Human Japanese app (on iOS).

## Time
#### ◊sent きょう :: today :: 今日
#### ◊sent きのう :: yesterday :: 昨日
- ◊Ebisu1 reading 2019-02-21T01:25:10.998Z, 1.249e+0,8.081e+0,1.394e+3
#### ◊sent あした :: tomorrow :: 明日
- ◊Ebisu1 reading 2019-03-13T05:33:19.221Z, 2.843e-1,9.772e+0,1.876e+3
#### ◊sent おととい :: day before yesterday :: 一昨日
- ◊Ebisu1 reading 2019-03-13T05:28:28.572Z, 3.000e+0,3.000e+0,2.500e-1
#### ◊sent あさって :: day after tomorrow :: 明後日
- ◊related hi5 :: ?? :: hi5
- ◊Ebisu1 reading 2019-03-13T05:28:33.931Z, 3.000e+0,3.000e+0,2.500e+0

後・あと *after, behind, more left* is very common grade 2 kanji.
  `;
    gitio.writeFileCommit(filename, content, 'init');
    FILESCONTENTS = new Map([[filename, {checked: true, content: parseFileContents(content)}]]);
    setFilesList([filename]);
    setSetupComplete(true);
    return;
  }

  let ls = (await gitio.ls()).filter(s => s.endsWith('.md'));
  let contents = await Promise.all(ls.map(f => gitio.readFile(f)));

  let map: FilesContents = new Map();
  ls.forEach((f, i) => map.set(f, {content: parseFileContents(contents[i])}));
  FILESCONTENTS = map;

  setFilesList(ls);
  setSetupComplete(true);
}

function Fileslist(props: {ls: string[], tellparent: (file: string, checked: boolean) => void}) {
  let flat = props.ls.map(f => ce('div', {className: 'input-group'}, ce('input', {
                                    type: 'checkbox',
                                    id: 'check-' + f,
                                    name: 'check-' + f,
                                    onClick: e => { props.tellparent(f, (e.target as any).checked); }
                                  }),
                                  ce('label', {htmlFor: 'check-' + f}, f)));
  return ce('fieldset', null, ce('legend', null, 'Files to use'), ...flat);
}

function Git(props: {}) {
  const [loginfo, setLonginfo] = useState(["", "", ""] as string[]);
  const [setupComplete, setSetupComplete] = useState(false);
  const [filesList, setFilesList] = useState([] as string[]);
  const [filesOnList, setFilesOnList] = useState([] as string[]);
  // console.log(loginfo, setupComplete, filesContents);
  useEffect(() => { initializeGit(loginfo, setSetupComplete, setFilesList); }, [...loginfo]);
  return ce(
      'div',
      null,
      ce(Login, {className: 'row', tellparent: (...v: string[]) => { setLonginfo(v); }}),
      ce(Fileslist, {
        className: 'row',
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
      setupComplete ? ce(IzumiSession, {className: 'row', filesOn: filesOnList, user: loginfo[1], token: loginfo[2]})
                    : '',
  );
}
function About() { return ce('div', null, ce('a', {href: 'https://github.com/fasiha/curtiz-web#readme'}, 'About')); }
ReactDOM.render(
    ce('div', {className: 'container'}, ce(Git, {className: 'row container'}), ce(About, {className: 'row'})),
    document.getElementById('root'));
