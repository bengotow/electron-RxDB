import path from 'path';
import fs from 'fs';
import Note from '../models/note';

export default class FolderImporter {
  run(dir) {
    const notes = [];
    for (const filename of fs.readdirSync(dir)) {
      if (filename.endsWith('.html')) {
        notes.push(new Note({
          name: filename.replace('.html', ''),
          content: fs.readFileSync(path.join(dir, filename)),
        }));
      }
    }
    window.Database.inTransaction((t) => {
      return t.persistModels(notes);
    })
  }
}
