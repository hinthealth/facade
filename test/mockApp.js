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
  }]);
