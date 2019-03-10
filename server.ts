import express from 'express';
import {readFile} from 'fs';
import {promisify} from 'util';

var globby = require('globby');
var readFileP = promisify(readFile);

const app = express();
const port = 3000;
const markdownsDir = 'markdowns';

app.get('/api/listMarkdowns', async (req, res) => {
  res.json((await globby([markdownsDir, '*.md'])).map((s: string) => s.replace(markdownsDir, '')));
});
app.get('/api', (req, res) => { res.send('Hi!'); });
app.use('/markdowns', express.static(markdownsDir));
app.use('/', express.static('client'));

app.listen(port, () => console.log(`Server started. Try $ curl "localhost:${port}"`));