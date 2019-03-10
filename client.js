"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const curtiz = __importStar(require("curtiz"));
const react_1 = __importStar(require("react"));
const react_dom_1 = __importDefault(require("react-dom"));
const ce = react_1.default.createElement;
function getFile(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        let fetched = yield fetch(filename);
        if (!fetched.ok) {
            throw new Error(`Error fetching ${filename}, ${fetched}`);
        }
        return fetched.text();
    });
}
function parseFileContents(text) { return curtiz.markdown.textToBlocks(text); }
function contentsToBestQuiz(contents, randomize) {
    const findBestQuiz = curtiz.markdown.findBestQuiz;
    const contentToLearned = content => content.filter(o => o instanceof curtiz.markdown.LozengeBlock && o.learned());
    const bestQuizzes = contents.map(content => findBestQuiz(contentToLearned(content), randomize).finalQuizzable);
    return findBestQuiz(bestQuizzes, randomize);
}
function Quiz(props) {
    const [answer, setAnswer] = react_1.useState('');
    const [finalSummaries, setFinalSummaries] = react_1.useState([]);
    const { contexts, clozes } = props.bestQuiz.finalQuiz.preQuiz();
    return ce('div', null, ce('p', null, 'contexts: ' + JSON.stringify(contexts)), ce('p', null, 'clozes: ' + JSON.stringify(clozes)), ce('form', {
        onSubmit: (e) => {
            e.preventDefault();
            let now = new Date();
            let scale = 1;
            let correct = props.bestQuiz.finalQuizzable.postQuiz(props.bestQuiz.finalQuiz, clozes, [answer], now, scale);
            let summary = props.bestQuiz.finalQuizzable.header;
            const init = curtiz.markdown.SentenceBlock.init;
            summary = summary.slice(summary.indexOf(init) + init.length);
            const finalSummary = correct ? ('💥 🔥 🎆 🎇 👏 🙌 👍 👌! ' + summary)
                : ('😭 🙅‍♀️ 🙅‍♂️ 👎 🤬. Expected answer: ' + clozes.join(' | ') +
                    ' — ' + summary);
            setFinalSummaries(finalSummaries.concat(finalSummary));
            props.allDoneFunc();
        }
    }, ce('label', null, 'Answer:', ce('input', { type: 'text', value: answer, onChange: e => setAnswer(e.target.value) })), ce('input', { type: 'submit', value: 'Submit' })), ce('ul', null, ...finalSummaries.map(s => ce('li', null, s))));
}
function IzumiSession(props) {
    const [questionNumber, setQuestionNumber] = react_1.useState(0);
    const { finalQuiz, finalQuizzable: finalLozengeBlock, finalPrediction, finalIndex } = contentsToBestQuiz(props.contents, false);
    console.log(finalQuiz, finalLozengeBlock, finalPrediction, finalIndex);
    if (!(finalQuiz && finalLozengeBlock && finalPrediction && typeof finalIndex === 'number')) {
        return ce('h1', null, 'No best quiz found.');
    }
    return ce('div', null, ce(Quiz, {
        allDoneFunc: () => setQuestionNumber(questionNumber + 1),
        bestQuiz: { finalQuiz, finalQuizzable: finalLozengeBlock, finalPrediction, finalIndex }
    }));
}
class Izumi extends react_1.default.Component {
    constructor(props) {
        super(props);
        this.state = {
            markdownFilenames: [
                '/markdowns/HJ.md',
            ],
            markdownRead: false,
            contents: [],
            markdowns: [],
        };
    }
    componentDidMount() {
        return __awaiter(this, void 0, void 0, function* () {
            let texts = yield Promise.all(this.state.markdownFilenames.map(filename => getFile(filename)));
            this.setState({
                markdowns: texts,
                markdownRead: true,
                contents: texts.map(text => parseFileContents(text)),
            });
        });
    }
    render() {
        if (!this.state.markdownRead) {
            return ce('h1', null, 'Not ready.');
        }
        return ce(IzumiSession, { contents: this.state.contents });
    }
}
react_dom_1.default.render(ce(Izumi), document.getElementById('root'));
