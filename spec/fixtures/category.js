import Attributes from '../../src/attributes'
import Model from '../../src/model'

export default class Category extends Model {
  static attributes = Object.assign({}, Model.attributes, {
    accountId: Attributes.String({
      modelKey: 'accountId',
      jsonKey: 'account_id',
      queryable: true,
    }),
    name: Attributes.String({
      queryable: true,
      modelKey: 'name',
    }),
    displayName: Attributes.String({
      queryable: true,
      modelKey: 'displayName',
      jsonKey: 'display_name',
    }),
  });
}
