import * as curtiz from 'curtiz';
import React from 'react';
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
class Quiz extends React.Component {
  props: BestQuiz;
  contexts: (string|null)[];
  clozes: string[][];
  state: {answer: string, finalSummary: string};
  constructor(props: BestQuiz) {
    super(props);
    this.props = props;
    const {contexts, clozes} = props.finalQuiz.preQuiz();
    this.contexts = contexts;
    this.clozes = clozes;
    this.state = {answer: '', finalSummary: ''};
    this.handleChange = this.handleChange.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }
  handleChange(event: React.SyntheticEvent) { this.setState({answer: (event.target as any).value}); }
  handleClick(event: React.SyntheticEvent) {
    console.log('yowup!');
    let answer = this.state.answer
    let now: Date = new Date();
    let scale = 1;
    let correct = this.props.finalQuizzable.postQuiz(this.props.finalQuiz, this.clozes, [answer], now, scale);
    let summary = this.props.finalQuizzable.header;
    const init = curtiz.markdown.SentenceBlock.init;
    summary = summary.slice(summary.indexOf(init) + init.length);
    const finalSummary =
        correct ? ('💥 🔥 🎆 🎇 👏 🙌 👍 👌! ' + summary)
                : ('😭 🙅‍♀️ 🙅‍♂️ 👎 🤬. Expected answer: ' + this.clozes.join(' | ') + ' — ' +
                   summary);
    this.setState({finalSummary});
  }
  render() {
    if (!this.state.finalSummary) {
      return ce(
          'div',
          null,
          ce('p', null, 'contexts: ' + JSON.stringify(this.contexts)),
          ce('p', null, 'clozes: ' + JSON.stringify(this.clozes)),
          ce('button', {onClick: this.handleClick}, 'Submit'),
          ce('input', {type: 'text', value: this.state.answer, onChange: this.handleChange}),
      );
    }
    return ce('div', null, this.state.finalSummary);
  }
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
    return (ce(Quiz, {finalQuiz, finalQuizzable: finalLozengeBlock, finalPrediction, finalIndex}));
    /*
    return ce('p', null, 'Gonna quiz you on:::' + finalLozengeBlock.header + ' from ' +
    this.state.markdownFilenames[finalIndex]);
    */
  }
  state: IzumiState;
}

ReactDOM.render(ce(Izumi), document.getElementById('root'));