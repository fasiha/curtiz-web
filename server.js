"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = require("fs");
const util_1 = require("util");
var globby = require('globby');
var readFileP = util_1.promisify(fs_1.readFile);
const app = express_1.default();
const port = 3000;
const markdownsDir = 'markdowns';
app.get('/api/listMarkdowns', (req, res) => __awaiter(this, void 0, void 0, function* () {
    res.json((yield globby([markdownsDir, '*.md'])).map((s) => s.replace(markdownsDir, '')));
}));
app.get('/api', (req, res) => { res.send('Hi!'); });
app.use('/markdowns', express_1.default.static(markdownsDir));
app.use('/', express_1.default.static('client'));
app.listen(port, () => console.log(`Server started. Try $ curl "localhost:${port}"`));
