import * as curtiz from 'curtiz';
import React, {useState} from 'react';
import ReactDOM from 'react-dom';
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

function Quiz(props: {allDoneFunc: () => void, bestQuiz: BestQuiz; [key: string]: any}) {
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

function IzumiSession(props: {[key: string]: any, contents: curtiz.markdown.Content[][]}) {
  const [questionNumber, setQuestionNumber] = useState(0);
  const {finalQuiz, finalQuizzable: finalLozengeBlock, finalPrediction, finalIndex} =
      contentsToBestQuiz(props.contents, false);
  console.log(finalQuiz, finalLozengeBlock, finalPrediction, finalIndex)
  if (!(finalQuiz && finalLozengeBlock && finalPrediction && typeof finalIndex === 'number')) {
    return ce('h1', null, 'No best quiz found.');
  }
  return ce(
      'div',
      null,
      ce(Quiz, {
        allDoneFunc: () => setQuestionNumber(questionNumber + 1),
        bestQuiz: {finalQuiz, finalQuizzable: finalLozengeBlock, finalPrediction, finalIndex}
      }),
  );
}

type IzumiState = {
  markdownFilenames: string[],
  markdownRead: boolean,
  contents: curtiz.markdown.Content[][],
  markdowns: string[],
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
    });
  }
  render() {
    if (!this.state.markdownRead) { return ce('h1', null, 'Not ready.'); }
    return ce(IzumiSession, {contents: this.state.contents});
  }
  state: IzumiState;
}

ReactDOM.render(ce(Izumi), document.getElementById('root'));