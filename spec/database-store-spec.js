/* eslint quote-props: 0 */
import TestModel from './fixtures/test-model';
import Thread from './fixtures/thread';
import ModelQuery from '../lib/query';
import {Database} from './fixtures';

const testMatchers = {'id': 'b'};

describe("Database", function DatabaseSpecs() {
  beforeEach(() => {
    TestModel.configureBasic();
    jasmine.clock().install();

    Database._atomicallyQueue = undefined;
    Database._mutationQueue = undefined;
    Database._inTransaction = false;

    spyOn(ModelQuery.prototype, 'where').and.callThrough();
    spyOn(Database, 'transactionDidCommitChanges').and.callFake(() => Promise.resolve());

    this.performed = [];

    // Note: We spy on _query and test all of the convenience methods that sit above
    // it. None of these tests evaluate whether _query works!
    spyOn(Database, "_query").and.callFake((query, values = []) => {
      this.performed.push({query, values});
      return Promise.resolve([]);
    });
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  describe("find", () =>
    it("should return a ModelQuery for retrieving a single item by Id", () => {
      const q = Database.find(TestModel, "4");
      expect(q.sql()).toBe("SELECT `TestModel`.`data` FROM `TestModel`  WHERE `TestModel`.`id` = '4'  LIMIT 1");
    })
  );

  describe("findBy", () => {
    it("should pass the provided predicates on to the ModelQuery", () => {
      Database.findBy(TestModel, testMatchers);
      expect(ModelQuery.prototype.where).toHaveBeenCalledWith(testMatchers);
    });

    it("should return a ModelQuery ready to be executed", () => {
      const q = Database.findBy(TestModel, testMatchers);
      expect(q.sql()).toBe("SELECT `TestModel`.`data` FROM `TestModel`  WHERE `TestModel`.`id` = 'b'  LIMIT 1");
    });
  });

  describe("findAll", () => {
    it("should pass the provided predicates on to the ModelQuery", () => {
      Database.findAll(TestModel, testMatchers);
      expect(ModelQuery.prototype.where).toHaveBeenCalledWith(testMatchers);
    });

    it("should return a ModelQuery ready to be executed", () => {
      const q = Database.findAll(TestModel, testMatchers);
      expect(q.sql()).toBe("SELECT `TestModel`.`data` FROM `TestModel`  WHERE `TestModel`.`id` = 'b'  ");
    });
  });

  describe("modelify", () => {
    beforeEach(() => {
      this.models = [
        new Thread({id: 'local-A'}),
        new Thread({id: 'local-B'}),
        new Thread({id: 'local-C'}),
        new Thread({id: 'local-D'}),
      ];
      // Actually returns correct sets for queries, since matchers can evaluate
      // themselves against models in memory
      spyOn(Database, 'run').and.callFake(query => {
        const results = this.models.filter(model =>
          query._matchers.every(matcher => matcher.evaluate(model))
        );
        return Promise.resolve(results);
      });
    });

    describe("when given an array or input that is not an array", () =>
      it("resolves immediately with an empty array", (done) => {
        Database.modelify(Thread, null).then(output => {
          expect(output).toEqual([]);
          done();
        });
      })
    );

    describe("when given an array of mixed ids and models", () =>
      it("resolves with an array of models", (done) => {
        const input = ['local-B', 'local-C', this.models[0]];
        const expectedOutput = [this.models[1], this.models[2], this.models[0]];
        Database.modelify(Thread, input).then(output => {
          expect(output).toEqual(expectedOutput);
          done();
        });
      })

    );

    describe("when the input is only IDs", () =>
      it("resolves with an array of models", (done) => {
        const input = ['local-B', 'local-C', 'local-D'];
        const expectedOutput = [this.models[1], this.models[2], this.models[3]];
        Database.modelify(Thread, input).then(output => {
          expect(output).toEqual(expectedOutput);
          done();
        });
      })

    );

    describe("when the input is all models", () =>
      it("resolves with an array of models", (done) => {
        const input = [this.models[0], this.models[1], this.models[2], this.models[3]];
        const expectedOutput = [this.models[0], this.models[1], this.models[2], this.models[3]];
        Database.modelify(Thread, input).then(output => {
          expect(output).toEqual(expectedOutput);
          done();
        });
      })

    );
  });

  describe("count", () => {
    it("should pass the provided predicates on to the ModelQuery", () => {
      Database.findAll(TestModel, testMatchers);
      expect(ModelQuery.prototype.where).toHaveBeenCalledWith(testMatchers);
    });

    it("should return a ModelQuery configured for COUNT ready to be executed", () => {
      const q = Database.findAll(TestModel, testMatchers);
      expect(q.sql()).toBe("SELECT `TestModel`.`data` FROM `TestModel`  WHERE `TestModel`.`id` = 'b'  ");
    });
  });

  describe("inTransaction", () => {
    it("calls the provided function inside an exclusive transaction", (done) =>
      Database.inTransaction(() => {
        return Database._query("TEST");
      }).then(() => {
        expect(this.performed.length).toBe(3);
        expect(this.performed[0].query).toBe("BEGIN IMMEDIATE TRANSACTION");
        expect(this.performed[1].query).toBe("TEST");
        expect(this.performed[2].query).toBe("COMMIT");
        done();
      })
    );

    it("preserves resolved values", (done) =>
      Database.inTransaction(() => {
        Database._query("TEST");
        return Promise.resolve("myValue");
      }).then(myValue => {
        expect(myValue).toBe("myValue");
        done();
      })
    );

    it("always fires a COMMIT, even if the body function fails", (done) =>
      Database.inTransaction(() => {
        throw new Error("BOOO");
      }).catch(() => {
        expect(this.performed.length).toBe(2);
        expect(this.performed[0].query).toBe("BEGIN IMMEDIATE TRANSACTION");
        expect(this.performed[1].query).toBe("COMMIT");
        done();
      })

    );

    it("can be called multiple times and get queued", (done) =>
      Promise.all([
        Database.inTransaction(() => { }),
        Database.inTransaction(() => { }),
        Database.inTransaction(() => { }),
      ]).then(() => {
        expect(this.performed.length).toBe(6);
        expect(this.performed[0].query).toBe("BEGIN IMMEDIATE TRANSACTION");
        expect(this.performed[1].query).toBe("COMMIT");
        expect(this.performed[2].query).toBe("BEGIN IMMEDIATE TRANSACTION");
        expect(this.performed[3].query).toBe("COMMIT");
        expect(this.performed[4].query).toBe("BEGIN IMMEDIATE TRANSACTION");
        expect(this.performed[5].query).toBe("COMMIT");
        done();
      })

    );

    it("carries on if one of them fails, but still calls the COMMIT for the failed block", (done) => {
      let caughtError = false;
      Promise.all([
        Database.inTransaction(() => Database._query("ONE")),
        Database.inTransaction(() => { throw new Error("fail"); }).catch(() => { caughtError = true }),
        Database.inTransaction(() => Database._query("THREE")),
      ]).then(() => {
        expect(this.performed.length).toBe(8);
        expect(this.performed[0].query).toBe("BEGIN IMMEDIATE TRANSACTION");
        expect(this.performed[1].query).toBe("ONE");
        expect(this.performed[2].query).toBe("COMMIT");
        expect(this.performed[3].query).toBe("BEGIN IMMEDIATE TRANSACTION");
        expect(this.performed[4].query).toBe("COMMIT");
        expect(this.performed[5].query).toBe("BEGIN IMMEDIATE TRANSACTION");
        expect(this.performed[6].query).toBe("THREE");
        expect(this.performed[7].query).toBe("COMMIT");
        expect(caughtError).toBe(true);
        done();
      });
    });

    it("is actually running in series and blocks on never-finishing specs", (done) => {
      let resolver = null;
      let blockedPromiseDone = false;
      Database.inTransaction(() => { }).then(() => {
        expect(this.performed.length).toBe(2);
        expect(this.performed[0].query).toBe("BEGIN IMMEDIATE TRANSACTION");
        expect(this.performed[1].query).toBe("COMMIT");
      })
      .then(() => {
        Database.inTransaction(() => new Promise((resolve) => {
          resolver = resolve;
        }))
        Database.inTransaction(() => { }).then(() => {
          blockedPromiseDone = true;
        })

        jasmine.waitFor(() => resolver).then(() => {
          expect(this.performed.length).toBe(3);
          expect(this.performed[2].query).toBe("BEGIN IMMEDIATE TRANSACTION");
          expect(blockedPromiseDone).toBe(false);

          // Now that we've made our assertion about blocking, we need to clean up
          // our test and actually resolve that blocked promise now, otherwise
          // remaining tests won't run properly.
          resolver();

          jasmine.waitFor(() => blockedPromiseDone).then(() => {
            expect(blockedPromiseDone).toBe(true);
            done();
          });
        });
      });
    });

    it("can be called multiple times and preserve return values", (done) => {
      let v1 = null;
      let v2 = null;
      let v3 = null;
      Promise.all([
        Database.inTransaction(() => "a").then(val => { v1 = val }),
        Database.inTransaction(() => "b").then(val => { v2 = val }),
        Database.inTransaction(() => "c").then(val => { v3 = val }),
      ]).then(() => {
        expect(v1).toBe("a");
        expect(v2).toBe("b");
        expect(v3).toBe("c");
        done();
      });
    });

    it("can be called multiple times and get queued", (done) =>
      Database.inTransaction(() => { })
      .then(() => Database.inTransaction(() => { }))
      .then(() => Database.inTransaction(() => { }))
      .then(() => {
        expect(this.performed.length).toBe(6);
        expect(this.performed[0].query).toBe("BEGIN IMMEDIATE TRANSACTION");
        expect(this.performed[1].query).toBe("COMMIT");
        expect(this.performed[2].query).toBe("BEGIN IMMEDIATE TRANSACTION");
        expect(this.performed[3].query).toBe("COMMIT");
        expect(this.performed[4].query).toBe("BEGIN IMMEDIATE TRANSACTION");
        expect(this.performed[5].query).toBe("COMMIT");
        done();
      })
    );
  });
});
