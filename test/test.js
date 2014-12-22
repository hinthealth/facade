/* jshint immed: false */
/* globals describe, beforeEach, it, xdescribe, templates, NachoBackend */
/* quotmark: true*/

(function () {
'use strict';
  afterEach(function() {
    // To clear things out between test runs;
    NachoBackend.resources = {};
    NachoBackend.db = {};
  });
  describe('NachoBackend', function() {
    describe('#resource', function() {
      it('should return a resource with the passed in attributes', function() {
        var resource = NachoBackend.resource({
          name: 'patient',
          url: '/api/provider/patients'
        });
        resource.name.should.eql('patient');
        resource.url.should.eql('/api/provider/patients');
      });
      it('should create a table in the database for that resource', function() {
        (function() {
          NachoBackend.db.patient
        }).should.be.undefined;

        NachoBackend.resource({
          name: 'patient',
          url: '/api/provider/patients'
        });

        NachoBackend.db.patient.should.be.an.Object;
      });
      it('should require a name', function() {
        (function() {
          NachoBackend.resource({
            url: '/api/provider/patients'
          });
        }).should.throw(/name/);
      });
      it('should require a url', function() {
        (function() {
          NachoBackend.resource({
            name: 'patient'
          });
        }).should.throw(/url/);
      });
      it('should require that names are unique', function() {
        NachoBackend.resource({
          name: 'patient',
          url: '/api/provider/patients'
        });

        (function() {
          NachoBackend.resource({
            name: 'patient',
            url: '/api/provider/patients'
          });
        }).should.throw(/already exists/);

      });
      it('should require that urls are unique', function() {
        NachoBackend.resource({
          name: 'patient',
          url: '/api/provider/patients'
        });

        (function() {
          NachoBackend.resource({
            name: 'practice',
            url: '/api/provider/patients'
          });
        }).should.throw(/already taken/);

      });
      it('should return an object with add method', function() {
        var resource = NachoBackend.resource({
          name: 'patient',
          url: '/api/provider/patients'
        });
        resource.add.should.be.a.Function;
      });
    });
    describe('#initialize', function() {
      var $httpBackend, $rootScope, createController, patient1, patient2, practice1, practice2;
      var patientList, practiceList;

      beforeEach(module('mockApp'))
      beforeEach(inject(function($injector) {
        $httpBackend = $injector.get(('$httpBackend'));
        $rootScope = $injector.get('$rootScope');
        var $controller = $injector.get('$controller');

        createController = function() {
          return $controller('mockController', {$scope: $rootScope});
        }
      }));

      beforeEach(function() {
        var patientResource = NachoBackend.resource({
          name: 'patient',
          url: '/api/provider/patients'
        });
        var practiceResource = NachoBackend.resource({
          name: 'practice',
          url: '/api/provider/practices'
        });
        NachoBackend.backend = $httpBackend;

        patient1 = patientResource.add({id: 1, name: "Joe Patient1"});
        patient2 = patientResource.add({id: 2, name: "Joe Patient2"});
        patientList = [{id: 1, name: "Joe Patient1"}, {id: 2, name: "Joe Patient2"}];

        practice1 = practiceResource.add({id: 1, name: "My Practice1"});
        practice2 = practiceResource.add({id: 2, name: "My Practice2"});
        practiceList = [ {id: 1, name: "My Practice1"}, {id: 2, name: "My Practice2"}];

        NachoBackend.initialize();

        createController();
      });
      it('should throw if it doesnt detect $httpBackend', function() {
        NachoBackend.backend = undefined;
        (function() {
          NachoBackend.initialize();
        }).should.throw(/httpBackend/);
      });
      describe('REST routes', function() {
        it('should create an GET index route for all created resources', function() {
          $rootScope.getList('patients');
          $rootScope.getList('practices');
          $httpBackend.flush();

          $rootScope.patients.should.eql(patientList);
          $rootScope.practices.should.eql(practiceList);
        });
        it('should create a GET/id route for each item of a resource', function() {
          $rootScope.getOne('patients', 1);
          $httpBackend.flush();
          $rootScope.item.should.eql({id: 1, name: "Joe Patient1"});

          $rootScope.getOne('patients', 2);
          $httpBackend.flush();
          $rootScope.item.should.eql({id: 2, name: "Joe Patient2"});
        });
        it('should create a PATCH route for each resource item, and perform the patch', function() {
          $rootScope.patch('patients', 1, {name: "Crazy new name!"});
          $httpBackend.flush();
          $rootScope.patchedItem.should.eql({id: 1, name: "Crazy new name!"});
        });
        it('should create a POST route for each resource item, and perform the POST', function() {
          $rootScope.post('patients', {id: 3, name: "My new patient!"});
          $httpBackend.flush();
          $rootScope.postedItem.should.eql({id: 3, name: "My new patient!"});
        });

        it('should return the newest version of an item if you update it in the DB', function() {
          $rootScope.getOne('patients', 1);
          $httpBackend.flush();
          $rootScope.item.should.eql({id: 1, name: "Joe Patient1"});

          NachoBackend.db.patient.find(1).name = "New Name";

          $rootScope.getOne('patients', 1);
          $httpBackend.flush();
          $rootScope.item.should.eql({id: 1, name: "New Name"});
        });
      })
    });
  });
  describe('the Resource object', function() {
    describe('#add', function() {
      var resource;
      beforeEach(function() {
        resource = NachoBackend.resource({
          name: 'patient',
          url: '/api/provider/patients'
        });
      });
      it("should take an object and add it to the database for that resource", function() {
        resource.add({id: 1, name: "Joe Bob"});
        NachoBackend.db.patient.find(1).should.eql({id: 1, name: "Joe Bob"});
      });
    });
    xdescribe('#resource', function() {
      it('should be able to nest resources', function() {

      });
    });
    xdescribe('#addRoute', function() {
      it('should be able to add custom routes', function() {
      });
    });
  });
}());
