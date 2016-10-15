import Category from './category'
import Attributes from '../../lib/attributes'
import Model from '../../lib/model'

export default class Message extends Model {

  static attributes = Object.assign({}, Model.attributes, {
    accountId: Attributes.String({
      modelKey: 'accountId',
      jsonKey: 'account_id',
      queryable: true,
    }),

    date: Attributes.DateTime({
      queryable: true,
      modelKey: 'date',
    }),

    body: Attributes.JoinedData({
      modelTable: 'MessageBody',
      modelKey: 'body',
    }),

    files: Attributes.Collection({
      modelKey: 'files',
      itemClass: File,
    }),

    uploads: Attributes.Object({
      queryable: false,
      modelKey: 'uploads',
    }),

    unread: Attributes.Boolean({
      queryable: true,
      modelKey: 'unread',
    }),

    events: Attributes.Collection({
      modelKey: 'events',
      itemClass: Event,
    }),

    starred: Attributes.Boolean({
      queryable: true,
      modelKey: 'starred',
    }),

    snippet: Attributes.String({
      modelKey: 'snippet',
    }),

    threadId: Attributes.ServerId({
      queryable: true,
      modelKey: 'threadId',
      jsonKey: 'thread_id',
    }),

    subject: Attributes.String({
      modelKey: 'subject',
    }),

    draft: Attributes.Boolean({
      modelKey: 'draft',
      jsonKey: 'draft',
      queryable: true,
    }),

    pristine: Attributes.Boolean({
      modelKey: 'pristine',
      jsonKey: 'pristine',
      queryable: false,
    }),

    version: Attributes.Number({
      modelKey: 'version',
      queryable: true,
    }),

    replyToMessageId: Attributes.ServerId({
      modelKey: 'replyToMessageId',
      jsonKey: 'reply_to_message_id',
    }),

    categories: Attributes.Collection({
      modelKey: 'categories',
      itemClass: Category,
    }),
  });
}
