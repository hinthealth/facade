(function() {
  'use strict'
  window.Facade = {};

  var backendIsInitialized = false;
  var definitionCallback;

  Facade.resources = {};
  Facade.db = {};
  var facadeRoutes = {};

  var originalResources = {}
  var originalDb = {}
  var originalRoutes = {};
  var customRouteOpts = [];


  // PUBLIC FUNCTIONS //
  Facade.resource = function(opts) {
    opts = opts || {};
    checkForResourceErrors(opts);

    // Create 'table' in the 'database'
    this.db[opts.name] = buildTable(opts.name);

    // Create a slot for the resources routes in the master route list;
    facadeRoutes[opts.name] = {};

    // Add resource to master list
    return this.resources[opts.name] = buildResource(opts);
  };

  Facade.initialize = function(opts) {
    checkForHttpBackend(opts);
    backendIsInitialized = true;
    _.isFunction(definitionCallback) && definitionCallback();
    _.each(this.resources, function(resource) {
      createRestRoutes(resource);
    });
    createCopiesOfMasterLists();
  };

  Facade.reset = function() {
    Facade.resources = _.clone(originalResources, true);
    Facade.db = _.clone(originalDb, true);
    facadeRoutes = _.clone(originalRoutes, true);
    backendIsInitialized = false;
  };

  Facade.define = function(callback) {
    definitionCallback = callback
  };

  Facade.undefine = function() {
    definitionCallback = undefined;
  }

  Facade.clear = function() {
    this.resources = {};
    this.db = {};
    facadeRoutes = {};
    customRouteOpts = [];
    this.backend = undefined;
    backendIsInitialized = false;
  };

  Facade.findRoute = function(method, url) {
    var routeObj;
    var fullRoute = [method, url].join(' ');
    var exists = _.any(facadeRoutes, function(resourceRoutes) {
      routeObj = resourceRoutes[fullRoute];
      if (routeObj) {
        return routeObj;
      }
      return routeObj = _.chain(resourceRoutes)
              .filter('regExp')
              .where({method: method})
              .find(function(route) {
                return route.regExp.test(url);
              }).value();
    });
    if (!exists) {
      throw new Error("The route " + fullRoute + " does not exist");
    }
    return routeObj;
  }


  // PRIVATE FUNCTIONS //


  // ** Routes ** //

  function createCopiesOfMasterLists() {
    originalResources = _.clone(Facade.resources, true);
    originalDb = _.clone(Facade.db, true);
    originalRoutes = _.clone(facadeRoutes, true);
  }

  function createRestRoutes(resource) {
    createCollectionRoutesFor(resource);
    createAllItemRoutes(resource);
  }


  function createCollectionRoutesFor(resource) {
    _.each(collectionRouteCreators(), function(routeCreator) {
      var opts = {resource: resource, method: routeCreator.method}
      routeCreator.createWith(opts);
      storeRoute(opts);
    })
  }

  function createAllItemRoutes(resource) {
    var allItems = getAllItems(resource);
    _.each(allItems, function(item) {
      createItemRoutesFor(resource, item);
    });
  }

  function createItemRoutesFor(resource, item) {
    _.each(itemRouteCreators(), function(routeCreator) {
      var opts = {resource: resource, item: item, method: routeCreator.method}
      routeCreator.createWith(opts);
      storeRoute(opts);
    });
    _.each(customRouteOpts, function(opts) {
      opts.item = item;
      createCustomRouteForItem(opts);
      storeRoute(opts);
    });
  }

  function createItemIdRoute(opts) {
    var headers = {};
    Facade.backend.whenGET(opts.resource.url + '/' + opts.item.id)
      .respond(function(method, url, data, headers) {
        var route = Facade.findRoute(method, url);
        var response = route.getSpecialResponseOr(function() {
          var item = getOneItem(opts.resource, opts.item.id);
          return [200, JSON.stringify(item), {}, 'OK'];
        })
        // TODO: Add check that the response is an array with 4 items;
        return response;
      });
  }


  function createPutRoute(opts) {
    var headers = {};
    Facade.backend.whenPUT(opts.resource.url + '/' + opts.item.id)
      .respond(function(method, url, data, headers) {
        data = data || {};
        var route = Facade.findRoute(method, url);
        var response = route.getSpecialResponseOr(function() {
          var item = getOneItem(opts.resource, opts.item.id);
          // Perform the patch on the db object
          _.assign(item, JSON.parse(data));
          return [200, JSON.stringify(item), headers, 'OK']
        })

        return response;
      });
  }


  function createDeleteRoute(opts) {
    var headers = {};
    Facade.backend.whenDELETE(opts.resource.url + '/' + opts.item.id)
      .respond(function(method, url, data, headers) {
        data = data || {};
        var route = Facade.findRoute(method, url);

        // Perform the delete on the db
        var response = route.getSpecialResponseOr(function() {
          var item = getTable(opts.resource).delete(opts.item.id);
          return [200, JSON.stringify(item), {}, 'OK'];
        })

        return response;
      });
  }

  function createCreateRoute(opts) {
    var headers = {};
    Facade.backend.whenPOST(opts.resource.url)
      .respond(function(method, url, data, headers) {
        data = data || {};
        data = JSON.parse(data);
        var route = Facade.findRoute(method, url);

        // Perform the POST on the db
        var response = route.getSpecialResponseOr(function() {
          var item = _.isFunction(opts.resource.createDefault) && opts.resource.createDefault(data);
          item = item || data;
          opts.resource.addItem(item);
          return [200, JSON.stringify(item), {}, 'OK'];
        })

        return response;
      });
  }

  function createIndexRoute(opts) {
    var headers = {};
    Facade.backend.whenGET(opts.resource.url)
      .respond(function(method, url, data, headers) {
        var route = Facade.findRoute(method, url);

        var response = route.getSpecialResponseOr(function() {
          return [200,    getAllItems(opts.resource), {},     'OK']
        })

        return response;
      });
  }


  function itemRouteCreators() {
    return  [
      {createWith: createItemIdRoute, method: 'GET'},
      {createWith: createPutRoute, method: 'PUT'},
      {createWith: createDeleteRoute, method: 'DELETE'}
    ];
  }

  function collectionRouteCreators() {
    return  [
      {createWith: createCreateRoute, method: 'POST'},
      {createWith: createIndexRoute, method: 'GET'}
    ];
  }


  function createCustomRouteForItem(opts) {
    throwIfRegex(opts.route);
    var fullUrl = opts.resource.url + '/' + opts.item.id + opts.route;
    Facade.backend.when(opts.method, fullUrl).respond(function(method, url, requestData, headers) {
      requestData = requestData || {};
      var route = Facade.findRoute(method, url);
      var item = getTable(opts.resource).find(opts.item.id);

      var response = route.getSpecialResponseOr(function() {
        return opts.callback(requestData, item, headers);
      });
      checkForValidResponse(response);

      return response;
    });
  }

  function createCustomRouteForCollection(opts) {
    var fullUrl = _.isRegExp(opts.route) ? opts.route : opts.resource.url + opts.route
    Facade.backend.when(opts.method, fullUrl).respond(function(method, url, requestData, headers) {
      requestData = requestData || {};
      var collection = getTable(opts.resource).getAll();
      var route = Facade.findRoute(method, url);

      var response = route.getSpecialResponseOr(function() {
        return opts.callback(requestData, collection);
      });
      checkForValidResponse(response);

      return response;
    });
  }

  function createExpectationFor(opts) {
    var fullUrl = opts.resource.url + opts.route;
    Facade.backend.expect(opts.method, fullUrl, withJSON(opts.expected))
      .respond(function(method, url, requestData, headers) {
        requestData = requestData || {};
        var collection = getTable(opts.resource).getAll();
        var route = Facade.findRoute(method, url);

        if (!route.hasSpecialResponse()) {
          _.isFunction(opts.callback) && opts.callback(requestData, collection);
        }

        var response = route.getSpecialResponseOr(function() {
          return [200, JSON.stringify(collection), {}, 'OK'];
        });

        return response;
      });
  }

  function storeRoute(opts) {
    opts.route = opts.route || '';
    if (_.isRegExp(opts.route)) {
      opts.regExp = opts.route;
    }else {
      var prefix = opts.resource.url;
      var fullUrl = opts.item ? prefix + '/' + opts.item.id + opts.route : prefix + opts.route;
      var fullRoute = [opts.method, fullUrl].join(' ')

      opts.fullRoute = fullRoute;
    }
    facadeRoutes[opts.resource.name][(opts.regExp || opts.fullRoute)] = buildRoute(opts);
  }

  function storeRouteOpts(opts) {
    customRouteOpts.push(opts);
  };


  function withJSON(expectedParams) {
    return function (postData) {
      var jsonData = JSON.parse(postData);
      if (!jsonData) {
        console.log("Unable to parse to JSON:", postData);
        return false;
      }
      return _.all(expectedParams, function (expectedValue, expectedKey) {
        return findParam(jsonData, expectedValue, expectedKey);
      });
    };

    function findParam(json, expectedVal, expectedKey) {
      if (json[expectedKey]) {
        if (json[expectedKey] === expectedVal) { return true }
        console.log('Expected', expectedKey, "to equal", expectedVal, "in", json, "but it was", json[expectedKey]);
        return false;
      }
      var nested = _.filter(json, function(val) {
        return _.isObject(val);
      })
      var foundParam = json[expectedKey] === val
      if (!nested && !foundParam) {
        console.log('Missing expectedKey', expectedKey, "in", nestedData, "should include", expectedParams);
        return false;
      }
      return _.any(nested, function(json) {
        return findParam(json, expectedVal, expectedKey);
      });
    }
  }

  // ** Class Factories ** //

  function buildResource(opts) {
    // For nesting child urls if called from a parent.
    opts = opts || {};
    opts.url = (this && this.url) ? this.url + opts.url : opts.url;
    return {
      url: opts.url,
      name: opts.name,
      addItem: function(item) {
        checkForResourceId(item);
        getTable(this).create(item);
        if (backendIsInitialized) {
          createItemRoutesFor(this, item);
        }
        return item;
      },
      addItems: function(items) {
        checkForArray(items);
        _.each(items, function(item) {
          this.addItem(item);
        }, this);
      },
      resource: buildResource,
      addRoute: function(opts) {
        opts = opts || {};
        checkForRequiredRouteArgs(opts);
        opts.resource = this;
        storeRouteOpts(opts);
        if (opts.onItem) {
          var allItems = getTable(this).getAll()
          _.each(allItems, function(item) {
            opts.item = item;
            createCustomRouteForItem(opts);
            storeRoute(opts);
          });
        }else {
          createCustomRouteForCollection(opts);
          storeRoute(opts);
        }
      },
      expect: function(method, route) {
        checkForValidMethod(method);
        route = route || '';
        var self = this;
        return {
          with: function(params) {
            opts = {method: method, route: route, expected: params, resource: self};
            createExpectationFor(opts);
          }
        }
      }
    };
  }

  function buildRoute(opts) {
    var specialResponses = [];
    return {
      fullRoute: opts.fullRoute,
      regExp: opts.regExp,
      method: opts.method,
      nextResponse: function(status, data) {
        specialResponses.push({status: status, data: data});
      },
      getSpecialResponse: function() {
        return specialResponses.shift();
      },
      hasSpecialResponse: function() {
        return Boolean(specialResponses.length);
      },
      getSpecialResponseOr: function(callback) {
        if (this.hasSpecialResponse()) {
          var response = this.getSpecialResponse();
          return [response.status, JSON.stringify(response.data), {}, 'OK'];
        }else {
          return _.isFunction(callback) && callback()
        }
      }
    }
  }

  function buildTable(name) {
    var storage = {};
    return {
      getAll: function() {
        return _.map(storage);
      },
      create: function(item) {
        checkForResourceId(item);
        var id = item.id;
        storage[JSON.stringify(id)] = item;
      },
      find: function(id, opts) {
        checkForIdToFindOn(id);
        opts = opts || {};
        var item = storage[JSON.stringify(id)];
        if (!item) {
          throw new Error("No item found in " + name + " table with id of " + id)
        }
        return opts.wrap ? itemWrapper(item, getResource(name)) : item;
      },
      delete: function(id) {
        checkForIdToFindOn(id);
        var id = JSON.stringify(id);
        var item = storage[id];
        if (!item) {
          throw new Error("No item found in " + name + " table with id of " + id + ". So can't delete it.");
        }
        storage[id] = null;
        return item;
      }
    }
  }


  // ** Db Helpers ** //

  function getTable(resource) {
    var table = Facade.db[resource.name];
    if (!table) {
      throw new Error("There doesnt appear to be a table called " + resource.name);
    }
    return table;
  }

  function getAllItems(resource) {
    return getTable(resource).getAll();
  }

  function getOneItem(resource, id, opts) {
    opts = opts || {};
    return getTable(resource).find(id, opts);
  }

  function itemWrapper(item, resource) {
    item = _.extend({}, item);
    item.showUrl = function() {
      return resource.url + '/' + item.id;
    }
    return item;
  }

  // ** Resource Helpers ** //

  function getResource(name) {
    var resource = Facade.resources[name];
    if (!resource) {
      throw new Error("There doesnt appear to be a resource called " + name);
    }
    return resource;
  }



  // ** Error Handling ** //

  function checkForResourceErrors(opts) {
    if (!_.isString(opts.name) ) {
      throw new Error("You must provide a name for the resource");
    }
    if (Facade.resources[opts.name]) {
      throw new Error(
        "A resource named " + opts.name + " already exists. Please choose a different name."
      );
    }
    if (!_.isString(opts.url) ) {
      throw new Error("You must provide a url for the " + opts.name + " resource");
    }
    var urls = _.pluck(Facade.resources, 'url');
    if ( _.find(urls, function(url) { return url === opts.url; }) ) {
      throw new Error("The url " + opts.url + " is already taken. Please change one");
    }
  };

  function checkForResourceId(resourceInstance) {
    if (!resourceInstance.id) {
      throw new Error("The resource must have an id property.");
    }
  }

  function checkForIdToFindOn(id) {
    if (!id) {
      throw new Error("You must pass in an id to find a record");
    }
  }

  function checkForArray(items) {
    if (!_.isArray(items)) {
      throw new Error("addItems must take an array")
    }
  }

  function checkForValidMethod(method) {
    if (!_.isString(method)) {
      throw new Error("No HTTP method was provided");
    }
    var httpVerbs = ['GET', 'POST', 'PATCH', 'PUT', 'HEAD', 'DELETE'];
    if (!_.contains(httpVerbs, method)) {
      throw new Error(method + " is not a valid HTTP method.")
    }
  };

  function checkForHttpBackend(opts) {
    opts = opts || {};
    Facade.backend = Facade.backend || opts.backend || {};
    if (!_.isFunction(Facade.backend.whenGET)) {
      throw new Error(
        "$httpBackend not detected. Either add it as an option when initializing, or set the" +
        " attribute directly on Facade via Facade.backend = $httpBackend"
      );
    }
  }

  function throwIfRegex(route) {
    if (_.isRegExp(route)) {
      throw new Error("Regex routes can't be used for item routes. Either make 'onItem' false" +
        " or make the route a string")
    }
  }

  function checkForRequiredRouteArgs(opts) {
    checkForValidMethod(opts.method);
    if (!_.isString(opts.route) && !_.isRegExp(opts.route)) {
      throw new Error("You must supply a route (eg: '/my_route') as either a string or regex");
    }
    if (!opts.callback) {
      throw new Error("You must supply a response callback for custom routes.");
    }
  }

  function checkForValidResponse(response) {
    if (!_.isArray(response)) { throw new Error("Response must be an array");}
    if (response.length !== 4) {
      throw new Error("Response does not appear to be in the form of [status, data, headers, status_text]" )
    }
  }

  function checkForUrlExistence(method, url) {
    var inquiredRoute = [method, url].join(' ');
  }

}).call(this);
