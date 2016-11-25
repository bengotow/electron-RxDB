import {Model, Attributes, SearchIndexes} from 'electron-rxdb';

const contentdiv = document.createElement('div');

export default class Note extends Model {
  static attributes = Object.assign(Model.attributes, {
    name: Attributes.String({
      modelKey: 'name',
      jsonKey: 'name',
      queryable: true,
    }),
    starred: Attributes.Boolean({
      modelKey: 'starred',
      jsonKey: 'starred',
      queryable: true,
    }),
    content: Attributes.String({
      modelKey: 'content',
      jsonKey: 'content',
    }),
    updatedAt: Attributes.DateTime({
      modelKey: 'updatedAt',
      jsonKey: 'updatedAt',
      queryable: true,
    }),
  });

  static searchIndexes = {
    titleAndContents: SearchIndexes.FTS5({
      version: 1,
      getDataForModel: (model) => {
        // the content is HTML, and the indexer needs words separated by spaces.
        contentdiv.innerHTML = model.content;
        return model.name + contentdiv.innerText;
      },
    }),
  }
}
