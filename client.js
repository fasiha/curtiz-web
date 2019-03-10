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
const react_1 = __importDefault(require("react"));
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
class Quiz extends react_1.default.Component {
    constructor(props) {
        super(props);
        this.props = props;
        const { contexts, clozes } = props.finalQuiz.preQuiz();
        this.contexts = contexts;
        this.clozes = clozes;
        this.state = { answer: '', finalSummary: '' };
        this.handleChange = this.handleChange.bind(this);
        this.handleClick = this.handleClick.bind(this);
    }
    handleChange(event) { this.setState({ answer: event.target.value }); }
    handleClick(event) {
        console.log('yowup!');
        let answer = this.state.answer;
        let now = new Date();
        let scale = 1;
        let correct = this.props.finalQuizzable.postQuiz(this.props.finalQuiz, this.clozes, [answer], now, scale);
        let summary = this.props.finalQuizzable.header;
        const init = curtiz.markdown.SentenceBlock.init;
        summary = summary.slice(summary.indexOf(init) + init.length);
        const finalSummary = correct ? ('💥 🔥 🎆 🎇 👏 🙌 👍 👌! ' + summary)
            : ('😭 🙅‍♀️ 🙅‍♂️ 👎 🤬. Expected answer: ' + this.clozes.join(' | ') + ' — ' +
                summary);
        this.setState({ finalSummary });
    }
    render() {
        if (!this.state.finalSummary) {
            return ce('div', null, ce('p', null, 'contexts: ' + JSON.stringify(this.contexts)), ce('p', null, 'clozes: ' + JSON.stringify(this.clozes)), ce('button', { onClick: this.handleClick }, 'Submit'), ce('input', { type: 'text', value: this.state.answer, onChange: this.handleChange }));
        }
        return ce('div', null, this.state.finalSummary);
    }
}
class Izumi extends react_1.default.Component {
    constructor(props) {
        super(props);
        this.state = {
            markdownFilenames: ['/markdowns/HJ.md', '/markdowns/grade1.md'],
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
        const { finalQuiz, finalQuizzable: finalLozengeBlock, finalPrediction, finalIndex } = contentsToBestQuiz(this.state.contents, false);
        console.log(finalQuiz, finalLozengeBlock, finalPrediction, finalIndex);
        if (!(finalQuiz && finalLozengeBlock && finalPrediction && typeof finalIndex === 'number')) {
            return ce('h1', null, 'No best quiz found.');
        }
        return (ce(Quiz, { finalQuiz, finalQuizzable: finalLozengeBlock, finalPrediction, finalIndex }));
        /*
        return ce('p', null, 'Gonna quiz you on:::' + finalLozengeBlock.header + ' from ' +
        this.state.markdownFilenames[finalIndex]);
        */
    }
}
react_dom_1.default.render(ce(Izumi), document.getElementById('root'));
