import * as curtiz from 'curtiz';
import React, {useEffect, useReducer, useState} from 'react';
import ReactDOM from 'react-dom';

import * as gitio from './gitio';

const ce = React.createElement;

async function getFile(filename: string): Promise<string> {
  let fetched = await fetch(filename);
  if (!fetched.ok) { throw new Error(`Error fetching ${filename}, ${fetched}`); }
  return fetched.text();
}
function parseFileContents(text: string) { return curtiz.markdown.textToBlocks(text); }
function contentsToBestQuiz(contents: curtiz.markdown.Content[][], randomize: boolean) {
  const findBestQuiz = curtiz.markdown.findBestQuiz;
  const contentToLearned: (content: curtiz.markdown.Content[]) => curtiz.markdown.LozengeBlock[] = content =>
      content.filter(o => o instanceof curtiz.markdown.LozengeBlock && o.learned()) as curtiz.markdown.LozengeBlock[];

  const bestQuizzes = contents.map(content => findBestQuiz(contentToLearned(content), randomize).finalQuizzable) as
                      curtiz.markdown.LozengeBlock[];

  return findBestQuiz(bestQuizzes, randomize);
}

type BestQuiz = {
  finalQuiz: curtiz.markdown.Quiz,
  finalQuizzable: curtiz.markdown.LozengeBlock,
  finalPrediction: curtiz.markdown.Predicted,
  finalIndex: number
};

function mapRight<T, U>(v: T[], mapper: (x: T, i?: number, v?: T[]) => U): U[] {
  const N = v.length;
  return Array.from(Array(N), (_, i) => mapper(v[N - i - 1], N - i - 1, v));
}

function Quiz(props: {allDoneFunc: () => void, bestQuiz: BestQuiz}) {
  const [answer, setAnswer] = useState('');
  const [finalSummaries, setFinalSummaries] = useState([] as string[]);
  const {contexts, clozes} = props.bestQuiz.finalQuiz.preQuiz();
  return ce(
      'div',
      null,
      ce('p', null, 'contexts: ' + JSON.stringify(contexts)),
      ce('p', null, 'clozes: ' + JSON.stringify(clozes)),
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
export function* enumerate<T>(v: T[]|IterableIterator<T>, n: number = 0): IterableIterator<[number, T]> {
  for (let x of v) { yield [n++, x]; }
}

type Mode = 'quiz'|'learn';
function IzumiSession(props: {contents: curtiz.markdown.Content[][]}) {
  const [questionNumber, setQuestionNumber] = useState(0);
  const [mode, setMode] = useState('quiz' as Mode);

  let modeElement;
  if (mode === 'quiz') {
    const {finalQuiz, finalQuizzable: finalLozengeBlock, finalPrediction, finalIndex} =
        contentsToBestQuiz(props.contents, false);
    // console.log(finalQuiz, finalLozengeBlock, finalPrediction, finalIndex)
    if (!(finalQuiz && finalLozengeBlock && finalPrediction && typeof finalIndex === 'number')) {
      modeElement = ce('h1', null, 'No quizzes found. Learn something!');
    } else {
      modeElement = ce(
          'div',
          null,
          ce(Quiz, {
            allDoneFunc: () => setQuestionNumber(questionNumber + 1),
            bestQuiz: {finalQuiz, finalQuizzable: finalLozengeBlock, finalPrediction, finalIndex}
          }),
      );
    }
  } else {
    let fileIndex: number = -1;
    let toLearn: curtiz.markdown.LozengeBlock|undefined;
    for (const [idx, content] of enumerate(props.contents)) {
      fileIndex = idx;
      toLearn = content.find(o => o instanceof curtiz.markdown.LozengeBlock &&
                                  !o.learned()) as (curtiz.markdown.LozengeBlock | undefined);
      if (toLearn) { break; }
    }
    modeElement = ce(Learn, {fileIndex, toLearn, allDoneFunc: () => setQuestionNumber(questionNumber + 1)});
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
                toLearn.learn(new Date(), scale)
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
  // writer(texts[fileIndex], contentToString(contents[fileIndex]), filenames[fileIndex], modifiedTimes[fileIndex]);
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

async function foo(loginfo: string[], setSetupComplete: (x: boolean) => void,
                   setFilesContents: (x: string[][]) => void) {
  if (!loginfo[0]) { return; }
  await gitio.setup(loginfo[0]);
  setSetupComplete(true);
  let ls = (await gitio.ls()).filter(s => s.endsWith('.md'));
  let contents = await Promise.all(ls.map(f => gitio.readFile(f)));
  setFilesContents(ls.map((f, i) => [f, contents[i]]));
}

/*
  <input type="checkbox" id="scales" name="scales"
         checked>
  <label for="scales">Scales</label>
*/
function flatten1(vov: any[][]): any[] { return vov.reduce((old, curr) => old.concat(curr), []); }
function Fileslist(props: {ls: string[]}) {
  console.log('ls', props.ls);
  let flat = flatten1(props.ls.map(f => [ce('input', {type: 'checkbox', id: 'check-' + f, name: 'check-' + f}),
                                         ce('label', {htmlFor: 'check-' + f})]));
  return ce('div', null, ...flat);
}

function Git(props: any) {
  const [loginfo, setLonginfo] = useState([] as string[]);
  const [setupComplete, setSetupComplete] = useState(false);
  const [filesContents, setFilesContents] = useState([] as string[][]);
  console.log(loginfo, setupComplete, filesContents);
  // useEffect(() => { foo(loginfo, setSetupComplete, setFilesContents); }); // FIXME causes infinite renders
  return ce(
      'div',
      null,
      ce(Login, {tellparent: (...v: string[]) => setLonginfo(v)}),
      ce(Fileslist, {ls: filesContents.map(([f, _]) => f)}),
      setupComplete ? ce('pre', null, JSON.stringify(filesContents, null, 1)) : '',
  );
}

type IzumiState = {
  markdownFilenames: string[],
  markdownRead: boolean,
  contents: curtiz.markdown.Content[][],
  markdowns: string[],
  git?: any,
};
class Izumi extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = {
      markdownFilenames: [
        '/markdowns/test.md',
        // '/markdowns/HJ.md',
        // '/markdowns/grade1.md',
      ],
      markdownRead: false,
      contents: [],
      markdowns: [],
    };
  }
  async componentDidMount() {
    let texts = await Promise.all(this.state.markdownFilenames.map(filename => getFile(filename)));
    this.setState({
      markdowns: texts,
      markdownRead: true,
      contents: texts.map(text => parseFileContents(text)),
      git: await gitio.test(),
    });
  }
  render() {
    if (!this.state.markdownRead) { return ce('h1', null, 'Not ready.'); }
    return ce(
        'div',
        null,
        ce(IzumiSession, {contents: this.state.contents}),
        ce('pre', null, JSON.stringify(this.state.git)),
    );
  }
  state: IzumiState;
}

ReactDOM.render(ce(Git), document.getElementById('root'));
// ReactDOM.render(ce(Izumi), document.getElementById('root'));