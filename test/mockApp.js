angular.module('mockApp', [])
  .controller('mockController', ['$scope', '$http', function($scope, $http) {
    $scope.error = {};
    $scope.item = {};
    $scope.getList = function(resource) {
      $http.get('/api/provider/' + resource)
        .success(function(items) {
          $scope[resource] = items;
        })
        .error(function(error, status) {
          $scope.error = error ? error : $scope.error;
          $scope.error.status = status;
        });
    };

    $scope.getOne = function(resource, id) {
      $http.get('/api/provider/' + resource + '/' + id)
        .success(function(item) {
          $scope.item = item;
        })
        .error(function(error, status) {
          $scope.error = error ? error : $scope.error;
          $scope.error.status = status;
        });
    };

    $scope.patch = function(resource, id, params) {
      $http.put('/api/provider/' + resource + '/' + id, params)
        .success(function(item) {
          $scope.patchedItem = item;
        })
        .error(function(error, status) {
          $scope.error = error ? error : $scope.error;
          $scope.error.status = status;
        });
    };

    $scope.post = function(resource, params) {
      $http.post('/api/provider/' + resource, params)
        .success(function(item) {
          $scope.postedItem = item;
        })
        .error(function(error, status) {
          $scope.error = error ? error : $scope.error;
          $scope.error.status = status;
        });
    };

    $scope.delete = function(resource, id) {
      $http.delete('/api/provider/' + resource + '/' + id)
        .success(function() {})
        .error(function(error, status) {
          $scope.error = error ? error : $scope.error;
          $scope.error.status = status;
        });
    };

    $scope.verifyAll = function() {
      $http.post('/api/provider/patients/verify')
        .success(function(patients) {
          $scope.patients = patients;
        })
        .error(function(error, status) {
          $scope.error = error ? error : $scope.error;
          $scope.error.status = status;
        });
    };

    $scope.verifyPatient = function(id) {
      $http.post('/api/provider/patients/' + id + '/verify')
        .success(function(verifiedPatient) {
          $scope.verifiedPatient = verifiedPatient;
        })
        .error(function(error, status) {
          $scope.error = error ? error : $scope.error;
          $scope.error.status = status;
        });
    };
  }]);
