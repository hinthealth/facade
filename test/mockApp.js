angular.module('mockApp', [])
  .controller('mockController', ['$scope', '$http', function($scope, $http) {
    $scope.getList = function(resource) {
      $http.get('/api/provider/' + resource).success(function(items) {
        $scope[resource] = items;
      });
    };

    $scope.getOne = function(resource, id) {
      $http.get('/api/provider/' + resource + '/' + id).success(function(item) {
        $scope.item = item;
      });
    };

    $scope.patch = function(resource, id, params) {
      $http.put('/api/provider/' + resource + '/' + id, params).success(function(item) {
        $scope.patchedItem = item;
      });
    };

    $scope.post = function(resource, params) {
      $http.post('/api/provider/' + resource, params).success(function(item) {
        $scope.postedItem = item;
      });
    };

    $scope.delete = function(resource, id) {
      $http.delete('/api/provider/' + resource + '/' + id).success(function() {});
    };
  }]);
