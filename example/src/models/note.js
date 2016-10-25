import {Model, Attributes} from 'electron-rxdb';

export default class Note extends Model {
  static attributes = Object.assign(Model.attributes, {
    name: Attributes.String({
      modelKey: 'name',
      jsonKey: 'name',
      queryable: true,
    }),
    content: Attributes.String({
      modelKey: 'content',
      jsonKey: 'content',
    }),
    createdAt: Attributes.DateTime({
      modelKey: 'createdAt',
      jsonKey: 'createdAt',
      queryable: true,
    }),
  });
}
