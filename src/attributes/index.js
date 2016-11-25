import Matcher from './matcher'
import SortOrder from './sort-order'
import AttributeNumber from './attribute-number'
import AttributeString from './attribute-string'
import AttributeObject from './attribute-object'
import AttributeBoolean from './attribute-boolean'
import AttributeDateTime from './attribute-datetime'
import AttributeCollection from './attribute-collection'
import AttributeJoinedData from './attribute-joined-data'

module.exports = {
  Matcher: Matcher,
  SortOrder: SortOrder,

  Number: (...args) => new AttributeNumber(...args),
  String: (...args) => new AttributeString(...args),
  Object: (...args) => new AttributeObject(...args),
  Boolean: (...args) => new AttributeBoolean(...args),
  DateTime: (...args) => new AttributeDateTime(...args),
  Collection: (...args) => new AttributeCollection(...args),
  JoinedData: (...args) => new AttributeJoinedData(...args),

  AttributeNumber: AttributeNumber,
  AttributeString: AttributeString,
  AttributeObject: AttributeObject,
  AttributeBoolean: AttributeBoolean,
  AttributeDateTime: AttributeDateTime,
  AttributeCollection: AttributeCollection,
  AttributeJoinedData: AttributeJoinedData,
};
