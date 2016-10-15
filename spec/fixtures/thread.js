import Category from './category'
import Attributes from '../../lib/attributes'
import Model from '../../lib/model'

export default class Thread extends Model {

  static attributes = Object.assign({}, Model.attributes, {
    accountId: Attributes.String({
      modelKey: 'accountId',
      jsonKey: 'account_id',
      queryable: true,
    }),

    snippet: Attributes.String({
      modelKey: 'snippet',
    }),

    subject: Attributes.String({
      queryable: true,
      modelKey: 'subject',
    }),

    unread: Attributes.Boolean({
      queryable: true,
      modelKey: 'unread',
    }),

    starred: Attributes.Boolean({
      queryable: true,
      modelKey: 'starred',
    }),

    version: Attributes.Number({
      queryable: true,
      modelKey: 'version',
    }),

    categories: Attributes.Collection({
      queryable: true,
      modelKey: 'categories',
      joinOnField: 'id',
      joinQueryableBy: ['inAllMail', 'lastMessageReceivedTimestamp', 'lastMessageSentTimestamp', 'unread'],
      itemClass: Category,
    }),

    categoriesType: Attributes.String({
      modelKey: 'categoriesType',
    }),

    hasAttachments: Attributes.Boolean({
      modelKey: 'has_attachments',
    }),

    lastMessageReceivedTimestamp: Attributes.Number({
      queryable: true,
      modelKey: 'lastMessageReceivedTimestamp',
      jsonKey: 'last_message_received_timestamp',
    }),

    lastMessageSentTimestamp: Attributes.Number({
      queryable: true,
      modelKey: 'lastMessageSentTimestamp',
      jsonKey: 'last_message_sent_timestamp',
    }),

    inAllMail: Attributes.Boolean({
      queryable: true,
      modelKey: 'inAllMail',
      jsonKey: 'in_all_mail',
    }),
  })

  static naturalSortOrder = () => {
    return Thread.attributes.lastMessageReceivedTimestamp.descending()
  }

  static additionalSQLiteConfig = {
    setup: () => [
      // ThreadCounts
      'CREATE TABLE IF NOT EXISTS `ThreadCounts` (`category_id` TEXT PRIMARY KEY, `unread` INTEGER, `total` INTEGER)',
      'CREATE UNIQUE INDEX IF NOT EXISTS ThreadCountsIndex ON `ThreadCounts` (category_id DESC)',

      // ThreadContact
      'CREATE INDEX IF NOT EXISTS ThreadContactDateIndex ON `ThreadContact` (last_message_received_timestamp DESC, value, id)',

      // ThreadCategory
      'CREATE INDEX IF NOT EXISTS ThreadListCategoryIndex ON `ThreadCategory` (last_message_received_timestamp DESC, value, in_all_mail, unread, id)',
      'CREATE INDEX IF NOT EXISTS ThreadListCategorySentIndex ON `ThreadCategory` (last_message_sent_timestamp DESC, value, in_all_mail, unread, id)',

      // Thread: General index
      'CREATE INDEX IF NOT EXISTS ThreadDateIndex ON `Thread` (last_message_received_timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS ThreadClientIdIndex ON `Thread` (client_id)',

      // Thread: Partial indexes for specific views
      'CREATE INDEX IF NOT EXISTS ThreadUnreadIndex ON `Thread` (account_id, last_message_received_timestamp DESC) WHERE unread = 1 AND in_all_mail = 1',
      'CREATE INDEX IF NOT EXISTS ThreadUnifiedUnreadIndex ON `Thread` (last_message_received_timestamp DESC) WHERE unread = 1 AND in_all_mail = 1',

      'DROP INDEX IF EXISTS `Thread`.ThreadStarIndex',
      'CREATE INDEX IF NOT EXISTS ThreadStarredIndex ON `Thread` (account_id, last_message_received_timestamp DESC) WHERE starred = 1 AND in_all_mail = 1',
      'CREATE INDEX IF NOT EXISTS ThreadUnifiedStarredIndex ON `Thread` (last_message_received_timestamp DESC) WHERE starred = 1 AND in_all_mail = 1',
    ],
  }
}
