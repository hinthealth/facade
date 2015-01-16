/* jshint immed: false */
/* globals describe, beforeEach, it, xdescribe, templates, Facade */
/* quotmark: true*/

(function () {
"use strict";

  // Mock app setup;
  var $httpBackend, $rootScope, createController, patient1, patient2, practice1, practice2;
  var patientList, practiceList;

  beforeEach(module("mockApp"))
  beforeEach(inject(function($injector) {
    $httpBackend = $injector.get(("$httpBackend"));
    $rootScope = $injector.get("$rootScope");
    var $controller = $injector.get("$controller");

    createController = function() {
      return $controller("mockController", {$scope: $rootScope});
    }
  }));

  afterEach(function() {
    // To clear things out between test runs;
    Facade.clear();
  });
  describe("Facade", function() {
    describe('#define', function() {
      it("should be able to take a callback that runs every time when initialized", function() {
        var callCount = 0;
        Facade.define(function() {
          var resource = Facade.resource({
            name: "patient",
            url: "/api/provider/patients"
          });
          callCount += 1;
        });
        Facade.initialize({backend: $httpBackend});
        Facade.clear();
        Facade.initialize({backend: $httpBackend});
        callCount.should.equal(2);
        Facade.undefine();
      });
    });
    describe("#resource", function() {
      it("should return a resource with the passed in attributes", function() {
        var resource = Facade.resource({
          name: "patient",
          url: "/api/provider/patients"
        });
        resource.name.should.eql("patient");
        resource.url.should.eql("/api/provider/patients");
      });
      it("should create a table in the database for that resource", function() {
        (function() {
          Facade.db.patient
        }).should.be.undefined;

        Facade.resource({
          name: "patient",
          url: "/api/provider/patients"
        });

        Facade.db.patient.should.be.an.Object;
      });
      it("should require a name", function() {
        (function() {
          Facade.resource({
            url: "/api/provider/patients"
          });
        }).should.throw(/name/);
      });
      it("should require a url", function() {
        (function() {
          Facade.resource({
            name: "patient"
          });
        }).should.throw(/url/);
      });
      it("should require that names are unique", function() {
        Facade.resource({
          name: "patient",
          url: "/api/provider/patients"
        });

        (function() {
          Facade.resource({
            name: "patient",
            url: "/api/provider/patients"
          });
        }).should.throw(/already exists/);

      });
      it("should require that urls are unique", function() {
        Facade.resource({
          name: "patient",
          url: "/api/provider/patients"
        });

        (function() {
          Facade.resource({
            name: "practice",
            url: "/api/provider/patients"
          });
        }).should.throw(/already taken/);

      });
      it("should return an object with add method", function() {
        var resource = Facade.resource({
          name: "patient",
          url: "/api/provider/patients"
        });
        resource.addItem.should.be.a.Function;
      });
      it("should store the url on the returned object", function() {
        var resource = Facade.resource({
          name: "patient",
          url: "/api/provider/patients"
        });
        resource.url.should.eql("/api/provider/patients");
      });
    });
    xdescribe("#clear", function() {
      it("should clear out the db", function() {

      });
      it("should clear out the routes", function() {

      });
      it("should clear out the resources", function() {

      });
    });
    xdescribe("#reset", function() {
      it("should reset database objects to the way the were at initialization", function() {

      });
      it("should reset routes to the way they were at initialization", function() {

      });
      it("should reset resources to the way the were at initialization", function() {

      });
    });
    xdescribe("#showRoutes", function() {
      beforeEach(function() {
        var resource = Facade.resource({
          name: "patient",
          url: "/api/provider/patients"
        });
        patientResource.addRoute({
          method:"POST",
          route:"/verify",
          callback: function(data, item) {
            item.verified = true;
          },
          onItem: true
        });
        Facade.initialize();
      });
      it("should show all rest routes", function() {

      });
      it("should show a custom route", function() {

      });
    });
    describe("#initialize", function() {
      beforeEach(function() {
        var patientResource = Facade.resource({
          name: "patient",
          url: "/api/provider/patients"
        });
        var practiceResource = Facade.resource({
          name: "practice",
          url: "/api/provider/practices"
        });
        Facade.backend = $httpBackend;

        patient1 = patientResource.addItem({id: 1, name: "Joe Patient1"});
        patient2 = patientResource.addItem({id: 2, name: "Joe Patient2"});
        patientList = [{id: 1, name: "Joe Patient1"}, {id: 2, name: "Joe Patient2"}];

        practice1 = practiceResource.addItem({id: 1, name: "My Practice1"});
        practice2 = practiceResource.addItem({id: 2, name: "My Practice2"});
        practiceList = [ {id: 1, name: "My Practice1"}, {id: 2, name: "My Practice2"}];

        Facade.initialize();

        createController();
      });
      it("should throw if it doesnt detect $httpBackend", function() {
        Facade.backend = undefined;
        (function() {
          Facade.initialize();
        }).should.throw(/httpBackend/);
      });
      describe("REST routes", function() {
        it("should create an GET index route for all created resources", function() {
          $rootScope.getList("patients");
          $rootScope.getList("practices");
          $httpBackend.flush();

          $rootScope.patients.should.eql(patientList);
          $rootScope.practices.should.eql(practiceList);
        });
        it("should create a GET/id route for each item of a resource", function() {
          $rootScope.getOne("patients", 1);
          $httpBackend.flush();
          $rootScope.item.should.eql({id: 1, name: "Joe Patient1"});

          $rootScope.getOne("patients", 2);
          $httpBackend.flush();
          $rootScope.item.should.eql({id: 2, name: "Joe Patient2"});
        });
        it("should create a PATCH route for each resource item, and perform the patch", function() {
          $rootScope.patch("patients", 1, {name: "Crazy new name!"});
          $httpBackend.flush();
          $rootScope.patchedItem.should.eql({id: 1, name: "Crazy new name!"});
        });
        it("should create a POST route for each resource item, and perform the POST", function() {
          $rootScope.post("patients", {id: 3, name: "My new patient!"});
          $httpBackend.flush();
          $rootScope.postedItem.should.eql({id: 3, name: "My new patient!"});
        });
        it("should create a DELETE route for each resource item, and perform the DELETE", function() {
          $rootScope.getOne("patients", 1);
          $httpBackend.flush();
          $rootScope.item.should.eql({id: 1, name: "Joe Patient1"});

          $rootScope.delete("patients", 1);
          $httpBackend.flush();

          (function() {
            $rootScope.getOne("patients", 1);
            $httpBackend.flush();
          }).should.throw(/No item found/)

        });

        it("should return the newest version of an item if you update it in the DB", function() {
          $rootScope.getOne("patients", 1);
          $httpBackend.flush();
          $rootScope.item.should.eql({id: 1, name: "Joe Patient1"});

          Facade.db.patient.find(1).name = "New Name";

          $rootScope.getOne("patients", 1);
          $httpBackend.flush();
          $rootScope.item.should.eql({id: 1, name: "New Name"});
        });
      })
      describe("#define", function() {
        it("should have a function to take all of the routes, child routes, etc", function() {

        });
      });
    });
  });
  describe("the Resource object", function() {
    describe("#addItem", function() {
      var patientResource;
      beforeEach(function() {
        patientResource = Facade.resource({
          name: "patient",
          url: "/api/provider/patients"
        });
        createController();
        Facade.initialize({backend: $httpBackend});
      });
      it("should take an object and add it to the database for that resource", function() {
        patientResource.addItem({id: 1, name: "Joe Bob"});
        Facade.db.patient.find(1).should.eql({id: 1, name: "Joe Bob"});
      });
      it("should auto add rest routes for that patient", function() {
        (function() {
          $rootScope.getOne("patients", 2);
          $httpBackend.flush();
        }).should.throw(/Unexpected request/);

        patientResource.addItem({id: 2, name: "New Patient"});

        $rootScope.getOne("patients", 2);
        $httpBackend.flush();

        $rootScope.item.should.eql({id: 2, name: "New Patient"});

      });
      it("should auto add custom routes for that patient", function() {
        (function() {
          $rootScope.verifyPatient(patient1.id);
          $httpBackend.flush();
        }).should.throw(/Unexpected request/);
        patientResource.addRoute({
          method:"POST",
          route:"/verify",
          callback: function(data, item) {
            item.verified = true;
          },
          onItem: true
        });

        var patient2 = patientResource.addItem({id: 2, name: "New Patient", verified: false});

        $rootScope.verifyPatient(patient2.id);
        $httpBackend.flush();

        $rootScope.verifiedPatient.verified.should.eql(true);
      });
    });
    describe("#addItems", function() {
      var patientResource;
      beforeEach(function() {
        patientResource = Facade.resource({
          name: "patient",
          url: "/api/provider/patients"
        });
        createController();
        Facade.initialize({backend: $httpBackend});
      });
      it("should take multiple objects and add them to the database for that resource", function() {
        var items = [{id: 1, name: "Joe Bob"}, {id: 2, name: "Jane Bob"}];
        patientResource.addItems(items);
        Facade.db.patient.find(1).should.eql({id: 1, name: "Joe Bob"});
        Facade.db.patient.find(2).should.eql({id: 2, name: "Jane Bob"});
      });
      it("should throw an error if an array is not given", function() {
        (function() {
          patientResource.addItems({id: 1});
        }).should.throw(/array/);
      });
    });
    describe("#resource", function() {
      it("should be able to nest urls", function() {
        var parentResource = Facade.resource({
          name: "patient",
          url: "/api/provider/patients"
        });

        var childResource = parentResource.resource({
          name: "patientCharges",
          url: "/charges"
        });
        childResource.url.should.eql("/api/provider/patients/charges");
      });
      it("should be able to nest urls many levels deep", function() {
        var parentResource = Facade.resource({
          name: "patient",
          url: "/api/provider/patients"
        });

        var childResource = parentResource.resource({
          name: "patientCharges",
          url: "/charges"
        });

        var grandChildResource = childResource.resource({
          name: "patientChargesPayments",
          url: "/payments"
        });

        grandChildResource.url.should.eql("/api/provider/patients/charges/payments");
      });
    });
    describe("#addRoute", function() {
      var patientResource;
      beforeEach(function() {
        patientResource = Facade.resource({
          name: "patient",
          url: "/api/provider/patients"
        });
        patient1 = patientResource.addItem({id: 1, name: "Joe Patient1", verified: false});
        patientResource.addItem({id: 2, name: "Joe Patient2", verified: false});

        Facade.backend = $httpBackend;
        Facade.initialize();

        createController();
      });

      it("should be able to add custom routes for a collection", function() {
        patientResource.addRoute({
          method: "POST",
          route: "/verify",
          callback: function(requestData, collection, headers) {
            _.each(collection, function(item) {
              item.verified = true;
            })
          }
        });

        $rootScope.getOne("patients", patient1.id);
        $httpBackend.flush();
        $rootScope.item.verified.should.eql(false);

        $rootScope.verifyAll();
        $httpBackend.flush();

        _.each($rootScope.patients, function(patient) {
          patient.verified.should.eql(true);
        });
      });
      it("should be able to add custom routes on routes with IDs", function() {
        patientResource.addRoute({
          method:"POST",
          route:"/verify",
          callback: function(data, item, headers) {
            item.verified = true;
          },
          onItem: true
        });

        $rootScope.getOne("patients", patient1.id);
        $httpBackend.flush();
        $rootScope.item.verified.should.eql(false);

        $rootScope.verifyPatient(patient1.id);
        $httpBackend.flush();

        $rootScope.verifiedPatient.verified.should.eql(true);
      });
      xit("should be able to change the status and response value of custom routes", function() {

      });
      xdescribe("short cut route methods", function() {
        it("should have a shortcut GET method", function() {

        });
        it("should have a shortcut POST method", function() {

        });
        it("should have a shortcut PATCH method", function() {

        });
        it("should have a shortcut PUT method", function() {

        });
        it("should have a shortcut DELETE method", function() {

        });
        it("should have a shorcut onItem method", function() {
          // Something like patientResource.onItem.get(")
        });
      });
    });
    describe("#findRoute", function() {
      var patientResource;
      beforeEach(function() {
        patientResource = Facade.resource({
          name: "patient",
          url: "/api/provider/patients"
        });
        patientResource.addItem({id: 1, name: "Joe Patient1"});
        patientResource.addItem({id: 2, name: "Joe Patient2"});
        patient1 = Facade.db.patient.find(1, {wrap: true});

        Facade.backend = $httpBackend;
        Facade.initialize();
      });
      it("should be able find existing routes", function() {
        var patientCollectionRoute = Facade.findRoute("GET", "/api/provider/patients");
        patientCollectionRoute.should.be.an.Object
      });
      it("should have a nextResponse method", function() {
        var patientCollectionRoute = Facade.findRoute("GET", "/api/provider/patients");
        patientCollectionRoute.nextResponse.should.be.a.Function
      });
      it("should fail on non-existant routes", function() {
        (function() {
          Facade.findRoute("GET", "/api/provider/NOTREAL");
        }).should.throw(/does not exist/);

      });
      describe("#nextResponse", function() {
        beforeEach(function() {
          createController();
        });

        describe("the restful ID routes", function() {
          describe("GET/id route", function() {
            beforeEach(function() {
              Facade
                .findRoute("GET", patient1.showUrl())
                .nextResponse(404, {message: "Not found"});
            });
            it("should be able to change the response of that route", function() {
              $rootScope.error.should.eql({});

              $rootScope.getOne("patients", patient1.id);
              $httpBackend.flush();
              $rootScope.error.should.eql({status: 404, message: "Not found"});
            });
            it("should only use the new response once, and then go back to the normal response", function() {
              $rootScope.item.should.eql({});
              $rootScope.error.should.eql({});

              $rootScope.getOne("patients", patient1.id);
              $httpBackend.flush();
              $rootScope.error.should.eql({status: 404, message: "Not found"});

              $rootScope.getOne("patients", patient1.id);
              $httpBackend.flush();
              $rootScope.item.should.eql({id: 1, name: "Joe Patient1"});
            });
          })
          it("should work on restful PATCH routes", function() {
            Facade
              .findRoute("PUT", patient1.showUrl())
              .nextResponse(404, {message: "Not found!"});

            $rootScope.error.should.eql({});

            $rootScope.patch('patients', patient1.id);
            $httpBackend.flush();
            $rootScope.error.should.eql({status: 404, message: "Not found!"});
          })
          it("should work on restful DELETE routes", function() {
            Facade
              .findRoute("DELETE", patient1.showUrl())
              .nextResponse(404, {message: "Not found!"});

            $rootScope.error.should.eql({});

            $rootScope.delete('patients', patient1.id);
            $httpBackend.flush();
            $rootScope.error.should.eql({status: 404, message: "Not found!"});
          });
        });
        describe("the restful collection routes", function() {
          it("should work on restful create routes", function() {
            Facade
              .findRoute("POST", patientResource.url)
              .nextResponse(404, {message: "Not found!"});

            $rootScope.error.should.eql({});

            $rootScope.post('patients', patient1.id);
            $httpBackend.flush();
            $rootScope.error.should.eql({status: 404, message: "Not found!"});
          });

          it("should work on restful index routes", function() {
            Facade
              .findRoute("GET", patientResource.url)
              .nextResponse(404, {message: "Not found!"});

            $rootScope.error.should.eql({});

            $rootScope.getList('patients');
            $httpBackend.flush();
            $rootScope.error.should.eql({status: 404, message: "Not found!"});
          });
        });
        describe("custom ID routes", function() {
          it("should work", function() {
            patientResource.addRoute({
              method:"POST",
              route:"/verify",
              callback: function(data, item, headers) {
                item.verified = true;
              },
              onItem: true
            });

            Facade
              .findRoute("POST", patient1.showUrl() + "/verify")
              .nextResponse(404, {message: "Can't verify!"});

            $rootScope.error.should.eql({});

            $rootScope.verifyPatient(patient1.id);
            $httpBackend.flush();
            $rootScope.error.should.eql({status: 404, message: "Can't verify!"});
          });
        })
        describe("custom collection routes", function() {
          it("should work", function() {
            patientResource.addRoute({
              method: "POST",
              route: "/verify",
              callback: function(requestData, collection, headers) {
                _.each(collection, function(item) {
                  item.verified = true;
                })
              }
            });

            Facade
              .findRoute("POST", patientResource.url + "/verify")
              .nextResponse(404, {message: "Can't verify!"});

            $rootScope.error.should.eql({});

            $rootScope.verifyAll();
            $httpBackend.flush();
            $rootScope.error.should.eql({status: 404, message: "Can't verify!"});
          });
        })
      });
    });
  });
}());
