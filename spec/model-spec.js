/* eslint quote-props: 0 */
import Model from '../lib/model';
import Utils from '../lib/utils';
import Attributes from '../lib/attributes';

class SubSubmodel extends Model {
  static attributes = Object.assign({}, Model.attributes, {
    'value': Attributes.Number({
      modelKey: 'value',
      jsonKey: 'value',
    }),
  });
}

class SubmodelItem extends Model {}

class Submodel extends Model {
  static attributes = Object.assign({}, Model.attributes, {
    'testBoolean': Attributes.Boolean({
      modelKey: 'testBoolean',
      jsonKey: 'test_boolean',
    }),
    'testCollection': Attributes.Collection({
      modelKey: 'testCollection',
      jsonKey: 'test_collection',
      itemClass: SubmodelItem,
    }),
    'testJoinedData': Attributes.JoinedData({
      modelKey: 'testJoinedData',
      jsonKey: 'test_joined_data',
    }),
    'testNumber': Attributes.Number({
      modelKey: 'testNumber',
      jsonKey: 'test_number',
    }),
    'testString': Attributes.String({
      modelKey: 'testString',
      jsonKey: 'test_string',
    }),
    'testArray': Attributes.Collection({
      itemClass: SubSubmodel,
      modelKey: 'testArray',
      jsonKey: 'test_array',
    }),
  });
}

describe("Model", function modelSpecs() {
  describe("constructor", () => {
    it("should accept a hash of attributes and assign them to the new Model", () => {
      const attrs = {
        id: "A",
        testNumber: "B",
      };
      const m = new Submodel(attrs);
      expect(m.id).toBe(attrs.id);
      expect(m.testNumber).toBe(attrs.testNumber);
    });

    it("automatically assigns an id to the model if no id is provided", () => {
      const m = new Model;
      expect(Utils.isTempId(m.id)).toBe(true);
    });
  });

  describe("attributes", () => {
    it("should return the attributes of the class", () => {
      const m = new Model();
      expect(m.attributes()).toEqual(m.constructor.attributes);
    })

    it("should guard against accidental modification", () => {
      const m = new Model();
      Object.assign(m.attributes(), {other: 1});
      expect(m.attributes()).toEqual(m.constructor.attributes);
    })
  });

  describe("clone", () =>
    it("should return a deep copy of the object", () => {
      const old = new Submodel({testNumber: 4, testArray: [new SubSubmodel({value: 2}), new SubSubmodel({value: 6})]});
      const clone = old.clone();

      // Check entire trees are equivalent
      expect(old.toJSON()).toEqual(clone.toJSON());
      // Check object identity has changed
      expect(old.constructor.name).toEqual(clone.constructor.name);
      expect(old.testArray).not.toBe(clone.testArray);
      // Check classes
      expect(old.testArray[0]).not.toBe(clone.testArray[0]);
      expect(old.testArray[0].constructor.name).toEqual(clone.testArray[0].constructor.name);
    })

  );

  describe("fromJSON", () => {
    beforeEach(() => {
      this.json = {
        'id': '1234',
        'test_number': 4,
        'test_boolean': true,
        'daysOld': 4,
        'test_string': 'bla',
      };
      this.m = new Submodel();
    });

    it("should assign attribute values by calling through to attribute fromJSON functions", () => {
      spyOn(Submodel.attributes.testString, 'fromJSON').and.callFake(() => 'inflated value!');
      this.m.fromJSON(this.json);
      expect(Submodel.attributes.testString.fromJSON.calls.count()).toBe(1);
      expect(this.m.testString).toBe('inflated value!');
    });

    it("should not touch attributes that are missing in the json", () => {
      this.m.fromJSON(this.json);
      expect(this.m.object).toBe(undefined);

      this.m.object = 'abc';
      this.m.fromJSON(this.json);
      expect(this.m.object).toBe('abc');
    });

    it("should not do anything with extra JSON keys", () => {
      this.m.fromJSON(this.json);
      expect(this.m.daysOld).toBe(undefined);
    });

    it("should maintain empty string as empty strings", () => {
      expect(this.m.testString).toBe(undefined);
      this.m.fromJSON({test_string: ''});
      expect(this.m.testString).toBe('');
    });

    describe("Attributes.Number", () =>
      it("should read number attributes and coerce them to numeric values", () => {
        this.m.fromJSON({'test_number': 4});
        expect(this.m.testNumber).toBe(4);

        this.m.fromJSON({'test_number': '4'});
        expect(this.m.testNumber).toBe(4);

        this.m.fromJSON({'test_number': 'lolz'});
        expect(this.m.testNumber).toBe(null);

        this.m.fromJSON({'test_number': 0});
        expect(this.m.testNumber).toBe(0);
      })

    );

    describe("Attributes.JoinedData", () =>
      it("should read joined data attributes and coerce them to string values", () => {
        this.m.fromJSON({'test_joined_data': null});
        expect(this.m.testJoinedData).toBe(null);

        this.m.fromJSON({'test_joined_data': ''});
        expect(this.m.testJoinedData).toBe('');

        this.m.fromJSON({'test_joined_data': 'lolz'});
        expect(this.m.testJoinedData).toBe('lolz');
      })

    );

    describe("Attributes.Collection", () => {
      it("should parse and inflate items", () => {
        this.m.fromJSON({'test_collection': [{id: '123'}]});
        expect(this.m.testCollection.length).toBe(1);
        expect(this.m.testCollection[0].id).toBe('123');
        expect(this.m.testCollection[0].constructor.name).toBe('SubmodelItem');
      });

      it("should be fine with malformed arrays", () => {
        this.m.fromJSON({'test_collection': [null]});
        expect(this.m.testCollection.length).toBe(0);
        this.m.fromJSON({'test_collection': []});
        expect(this.m.testCollection.length).toBe(0);
        this.m.fromJSON({'test_collection': null});
        expect(this.m.testCollection.length).toBe(0);
      });
    });

    describe("Attributes.Boolean", () =>
      it("should read `true` or true and coerce everything else to false", () => {
        this.m.fromJSON({'test_boolean': true});
        expect(this.m.testBoolean).toBe(true);

        this.m.fromJSON({'test_boolean': 'true'});
        expect(this.m.testBoolean).toBe(true);

        this.m.fromJSON({'test_boolean': 4});
        expect(this.m.testBoolean).toBe(false);

        this.m.fromJSON({'test_boolean': '4'});
        expect(this.m.testBoolean).toBe(false);

        this.m.fromJSON({'test_boolean': false});
        expect(this.m.testBoolean).toBe(false);

        this.m.fromJSON({'test_boolean': 0});
        expect(this.m.testBoolean).toBe(false);

        this.m.fromJSON({'test_boolean': null});
        expect(this.m.testBoolean).toBe(false);
      })

    );
  });

  describe("toJSON", () => {
    beforeEach(() => {
      this.model = new Submodel({
        id: "1234",
        testString: "ACD",
      });
      return;
    });

    it("should return a JSON object and call attribute toJSON functions to map values", () => {
      spyOn(Submodel.attributes.testString, 'toJSON').and.callFake(() => 'inflated value!');

      const json = this.model.toJSON();
      expect(json instanceof Object).toBe(true);
      expect(json.id).toBe('1234');
      expect(json.test_string).toBe('inflated value!');
    });

    it("should surface any exception one of the attribute toJSON functions raises", () => {
      spyOn(Submodel.attributes.testString, 'toJSON').and.callFake(() => {
        throw new Error("Can't convert value into JSON format");
      });
      expect(() => { this.model.toJSON(); }).toThrow();
    });
  });

  describe("matches", () => {
    beforeEach(() => {
      this.model = new Model({
        id: "1234",
        testString: "ACD",
      });

      this.truthyMatcher = {evaluate() { return true; }};
      this.falsyMatcher = {evaluate() { return false; }};
    });

    it("should run the matchers and return true iff all matchers pass", () => {
      expect(this.model.matches([this.truthyMatcher, this.truthyMatcher])).toBe(true);
      expect(this.model.matches([this.truthyMatcher, this.falsyMatcher])).toBe(false);
      expect(this.model.matches([this.falsyMatcher, this.truthyMatcher])).toBe(false);
    });

    it("should pass itself as an argument to the matchers", () => {
      spyOn(this.truthyMatcher, 'evaluate').and.callFake(param => {
        expect(param).toBe(this.model);
      });
      this.model.matches([this.truthyMatcher]);
    });
  });
});
