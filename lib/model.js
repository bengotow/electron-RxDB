import Attributes from './attributes';

function generateTempId() {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `local-${s4()}${s4()}-${s4()}`;
}
/*
Public: A base class for API objects that provides abstract support for
serialization and deserialization, matching by attributes, and ID-based equality.

//// Attributes

`id`: {AttributeString} The resolved canonical ID of the model used in the
database and generally throughout the app.

`object`: {AttributeString} The model's type. This field is used by the JSON
 deserializer to create an instance of the correct class when inflating the object.

`accountId`: {AttributeString} The string Account Id this model belongs to.

Section: Models
*/
export default class Model {

  static attributes = {
    id: Attributes.String({
      queryable: true,
      modelKey: 'id',
    }),
  }

  static naturalSortOrder() {
    return null;
  }

  constructor(values = {}) {
    for (const key of Object.keys(this.constructor.attributes)) {
      this[key] = values[key];
    }
    this.id = this.id || generateTempId();
  }

  clone() {
    return (new this.constructor()).fromJSON(this.toJSON())
  }

  // Public: Returns an {Array} of {Attribute} objects defined on the Model's constructor
  //
  attributes() {
    return Object.assign({}, this.constructor.attributes)
  }

  // Public: Inflates the model object from JSON, using the defined attributes to
  // guide type coercision.
  //
  // - `json` A plain Javascript {Object} with the JSON representation of the model.
  //
  // This method is chainable.
  //
  fromJSON(json) {
    // Note: The loop in this function has been optimized for the V8 'fast case'
    // https://github.com/petkaantonov/bluebird/wiki/Optimization-killers
    //
    for (const key of Object.keys(this.constructor.attributes)) {
      const attr = this.constructor.attributes[key];
      const attrValue = json[attr.jsonKey];
      if (attrValue !== undefined) {
        this[key] = attr.fromJSON(attrValue);
      }
    }
    return this;
  }

  // Public: Deflates the model to a plain JSON object. Only attributes defined
  // on the model are included in the JSON.
  //
  // - `options` (optional) An {Object} with additional options. To skip joined
  //    data attributes in the toJSON representation, pass the `joined:false`
  //
  // Returns an {Object} with the JSON representation of the model.
  //
  toJSON(options = {}) {
    const json = {}
    for (const key of Object.keys(this.constructor.attributes)) {
      const attr = this.constructor.attributes[key];
      const attrValue = this[key];

      if (attrValue === undefined) {
        continue;
      }
      if (attr instanceof Attributes.AttributeJoinedData && (options.joined === false)) {
        continue;
      }
      json[attr.jsonKey] = attr.toJSON(attrValue);
    }
    return json;
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  // Public: Evaluates the model against one or more {Matcher} objects.
  //
  // - `criteria` An {Array} of {Matcher}s to run on the model.
  //
  // Returns true if the model matches the criteria.
  //
  matches(criteria) {
    if (!(criteria instanceof Array)) {
      return false;
    }
    for (const matcher of criteria) {
      if (!matcher.evaluate(this)) {
        return false;
      }
    }
    return true;
  }
}
