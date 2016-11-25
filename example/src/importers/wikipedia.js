import {remote} from 'electron';
import {EventEmitter} from 'events';
import request from 'request';
import Note from '../models/note';

const StorageKey = "lastWikipediaKey3";

export default class WikipediaImporter extends EventEmitter {
  constructor() {
    super();
    this.running = false;
  }

  run() {
    this.running = true;
    this.count = 0;
    this._runSingleIteration();
    this.emit('updated');
  }

  cancel() {
    this.running = false;
    this.emit('updated');
  }

  processResponse(error, response, body) {
    if (error) {
      return {error};
    }
    if (response.statusCode !== 200) {
      return {error: new Error(`Got status code ${response.statusCode}`)};
    }

    let json = null;
    try {
      json = JSON.parse(body);
    } catch (error) {
      console.log("Got invalid JSON? Body: ");
      console.log(body);
      return {error};
    }
    return {json};
  }

  fetchArticleIds(callback) {
    const lastArticleKey = localStorage.getItem(StorageKey) || "Apple";

    console.log(`Fetching articles from ${lastArticleKey}`);
    request(`https://en.wikipedia.org/w/api.php?format=json&action=query&list=allpages&apfrom=${lastArticleKey}&apminsize=50000`, (err, response, body) => {
      const {error, json} = this.processResponse(err, response, body);
      if (error) {
        return callback(error);
      }

      if (json.query && json.query.allpages) {
        const ids = json.query.allpages.map(p => p.pageid);
        this.fetchArticleExtracts(ids, '', (err) => {
          if (err) {
            return callback(err);
          }

          localStorage.setItem(StorageKey, json.continue.apcontinue);
          return callback(null);
        });
      }
    });
  }

  fetchArticleExtracts(ids, excontinue, callback) {
    request(`https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&pageids=${ids.join('|')}&excontinue=${excontinue}`, (err, response, body) => {
      const {error, json} = this.processResponse(err, response, body);
      if (error) {
        return callback(error);
      }

      if (!json.query || !json.query.pages) {
        return callback(new Error("JSON did not contain query or query.pages"));
      }
      const notes = [];
      for (const key of Object.keys(json.query.pages)) {
        const article = json.query.pages[key];
        const {title, extract} = article;
        if (extract) {
          notes.push(new Note({
            name: title,
            content: extract,
          }))
        }
      }

      this.count += notes.length;
      this.emit('updated');

      window.Database.inTransaction((t) => {
        return t.persistModels(notes)
      });

      if (json.continue && json.continue.excontinue) {
        this.fetchArticleExtracts(ids, json.continue.excontinue, callback)
      } else {
        callback(null);
      }
    })
  }

  _runSingleIteration() {
    this.fetchArticleIds((err) => {
      if (err) {
        console.error(err);
        remote.dialog.showErrorBox("Wikipedia Crawler Stopped", err.stack);

        this.running = false;
        this.emit('updated');
        return;
      }
      if (this.running) {
        this._runSingleIteration();
      }
    });
  }
}
