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

function Quiz(props: {bestQuiz: BestQuiz; [key: string]: any}) {
  const [answer, setAnswer] = useState('');
  const [finalSummary, setFinalSummary] = useState('');
  const {contexts, clozes} = props.bestQuiz.finalQuiz.preQuiz();
  if (!finalSummary) {
    return ce(
        'div',
        null,
        ce('p', null, 'contexts: ' + JSON.stringify(contexts)),
        ce('p', null, 'clozes: ' + JSON.stringify(clozes)),
        ce('button', {
          onClick: _ => {
            let now: Date = new Date();
            let scale = 1;
            let correct =
                props.bestQuiz.finalQuizzable.postQuiz(props.bestQuiz.finalQuiz, clozes, [answer], now, scale);
            let summary = props.bestQuiz.finalQuizzable.header;
            const init = curtiz.markdown.SentenceBlock.init;
            summary = summary.slice(summary.indexOf(init) + init.length);
            const finalSummary =
                correct ? ('💥 🔥 🎆 🎇 👏 🙌 👍 👌! ' + summary)
                        : ('😭 🙅‍♀️ 🙅‍♂️ 👎 🤬. Expected answer: ' + clozes.join(' | ') +
                           ' — ' + summary);
            setFinalSummary(finalSummary);
          }
        },
           'Submit'),
        ce('input', {type: 'text', value: answer, onChange: event => setAnswer(event.target.value)}),
    );
  }
  return ce('div', null, finalSummary);
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
      markdownFilenames: ['/markdowns/HJ.md', '/markdowns/grade1.md'],
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
    const {finalQuiz, finalQuizzable: finalLozengeBlock, finalPrediction, finalIndex} =
        contentsToBestQuiz(this.state.contents, false);
    console.log(finalQuiz, finalLozengeBlock, finalPrediction, finalIndex)
    if (!(finalQuiz && finalLozengeBlock && finalPrediction && typeof finalIndex === 'number')) {
      return ce('h1', null, 'No best quiz found.');
    }
    return (ce(Quiz, {bestQuiz: {finalQuiz, finalQuizzable: finalLozengeBlock, finalPrediction, finalIndex}}));
    /*
    return ce('p', null, 'Gonna quiz you on:::' + finalLozengeBlock.header + ' from ' +
    this.state.markdownFilenames[finalIndex]);
    */
  }
  state: IzumiState;
}

ReactDOM.render(ce(Izumi), document.getElementById('root'));